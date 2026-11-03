// src/tts/tts.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiCallService } from '../gemini/geminiCall.service.js';
import { CharacterService } from '../character/character.service.js';
import { GeminiTranscribeServiceLive } from '../gemini/gemini-transcribe-live.service.js';
import Cartesia from '@cartesia/cartesia-js';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' }, // tighten in production
})
export class TtsGateway {
  @WebSocketServer()
  server!: Server;

  private cartesia: Cartesia;

  private runs = new Map<string, { runId: number; abort: AbortController }>();
  private runCounter = 0;

  private cartesiaWsByClient = new Map<string, Awaited<ReturnType<Cartesia['tts']['websocket']>>>();

  constructor(
    private readonly config: ConfigService,
    private readonly LLMCall: GeminiCallService,
    private readonly geminiTranscript:GeminiTranscribeServiceLive,
    private readonly characterService:CharacterService,
  ) {
    const apiKey = this.config.get<string>('CARTESIA_API_KEY');
    this.cartesia = new Cartesia({ apiKey });
  }

  @SubscribeMessage('start-conversation')
  async handleConversation(
    @MessageBody() data: { message: string},
    @ConnectedSocket() client: Socket,
  ) {
    console.log(data.message)
    return this.startRun(client,data.message);
  }

  @SubscribeMessage('start-recording')
  async handleStartRecording(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {

    // 1 Initialize the upstream connection to google when start recording 
    // Pass the call back function that handle return transcript
    try{
      await this.geminiTranscript.connectToGemini(client.id,async (e)=>{
        
        switch(e.type){
          case 'interim':

            // barge-in - during start run if receive interim cancel run
            if (this.runs.has(client.id)) this.cancelRun(client.id);  

            client.emit('transcript-interim', { text: e.text });
            break;

          case 'final':
          client.emit('transcript-final', { text: e.text });

          // cancels any leftover, run itself - got a sencetence and go to the next pipline - can be interrupt
          this.startRun(client, e.text);  

          console.log(e.text);
          break;

          case 'speech-start':
          case 'speech-end':
            client.emit(e.type, {});
            break;
          }
      })

      // tell the client that gemini is ready
      client.emit('recording-ready');
    }
    catch(error){
      client.emit('error', { message: 'Failed to connect to Gemini' });
    }

  }

  @SubscribeMessage('audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() chunk: Buffer, // Socket.IO automatically converts ArrayBuffer → Buffer
  ) {
    // 1 wrap and send chunk to Gemini Transcript websocket service
    this.geminiTranscript.sendAudioChunk(chunk);
  }

  @SubscribeMessage('stop-recording')
  handleStopRecording(@ConnectedSocket() client: Socket) {
    client.emit('recording-stopped');

    console.log(`Stopped recording for ${client.id}`);

    // disconnect to gemini ws when stop recording
    this.geminiTranscript.close();
  }

  @SubscribeMessage('interrupt')
  handleInterrupt(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { runId: number },
  ) {
    const run = this.runs.get(client.id);
    if (!run || run.runId !== data.runId) return; // ignore stale interrupt

    this.cancelRun(client.id);
  }

  // get or create a shared WS for this client
  private async getCartesiaWs(clientId: string) {
    let ws = this.cartesiaWsByClient.get(clientId);
    if (ws) return ws;

    ws = await this.cartesia.tts.websocket();
    ws.on('error', (err) => {
      console.error(`[Cartesia WS] ${clientId}`, err);
      this.cartesiaWsByClient.delete(clientId);
    });
    // Optional: clean up on unexpected close
    // (depends on the exact event the SDK emits)
    this.cartesiaWsByClient.set(clientId, ws);
    return ws;
  }

  // close catesia connection
  private async closeCartesiaWs(clientId: string) {
    const ws = this.cartesiaWsByClient.get(clientId);
    if (ws) {
      try { ws.close(); } catch {}
      this.cartesiaWsByClient.delete(clientId);
    }
  }

  private async streamTTS(
    client: Socket,
    voiceId: string,
    modelId: string,
    sentence: string,
    sentenceIndex: number,
    runId: number,
    signal:AbortSignal,
    ) {
    if(signal.aborted) return;

    const ws = await this.getCartesiaWs(client.id);
    const onAbort = () => ws.close();
    signal.addEventListener('abort',onAbort,{once:true})

    try {
        if(signal.aborted) return ;

        const ctx = ws.context({
        model_id: modelId,
        voice: voiceId,
        language: 'en',
        output_format: {
            container: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: 24000,
        },
        add_timestamps: true, 
        });

        await ctx.push({ transcript: sentence });
        await ctx.no_more_inputs();

        for await (const event of ctx.receive()) {
          if(signal.aborted) return;

          if (event.type === 'chunk' && event.audio) {
              // event.audio is already a Buffer
              const base64Audio = Buffer.from(event.audio).toString('base64');

              client.emit('tts-chunk-catesia', {
              audio: base64Audio,
              alignment: null,          
              sentenceIndex,
              runId,
              });
          }

        // Timestamps come as a separate event
        if (event.type === 'timestamps' && (event as any).word_timestamps) {
            client.emit('tts-timestamps', {
            alignment: (event as any).word_timestamps,
            sentenceIndex,
            runId,
            });
        }

        if (event.type === 'error') {
            throw new Error(
            (event as any).message || (event as any).title || 'Cartesia TTS error',
            );
        }
        }
    } 
    catch(e){
      if(!signal.aborted) throw e;
    }
    finally {
        signal.removeEventListener('abort',onAbort);
    }
  } 

  private cancelRun(clientId: string) {
    const run = this.runs.get(clientId);
    if (!run) return;

    run.abort.abort();
    this.runs.delete(clientId);

    this.server.to(clientId).emit('interrupted', { runId: run.runId });
  }

  @SubscribeMessage('select-character')
  async selectCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { characterId: string },
  ) {
    const character = await this.characterService.getAvailableCharacter(
      'userId',
      data.characterId,
    );

    if(!character) {
      client.emit('failed-character-select', { characterId: data.characterId });
      return;
    }

    client.data.character = character;
    client.emit('character-selected', { characterId: character.id });
  }

  private async startRun(client: Socket, message: string) {
    this.cancelRun(client.id);                 // always kill the old run first
    const runId = ++this.runCounter;
    const abort = new AbortController();
    this.runs.set(client.id, { runId, abort });

    client.emit('run-started', { runId });

    return this.runConversation(client, message, runId, abort.signal).finally(() => {
      if (this.runs.get(client.id)?.abort === abort) this.runs.delete(client.id);
    });
  }

  async runConversation(client:Socket,message:string,runId:number,signal:AbortSignal) {

    // defualt
    let voiceId = client.data.character.voiceId;
    if(!voiceId) voiceId = '5f2517fc-ea7a-484f-84c4-3a1e361adecb';
    
    const modelId = 'sonic-3.6'; // or 'sonic-latest'

    try {
      const llmStream = this.LLMCall.streamAi(message,client.data.character.systemPrompt,signal);
      console.log(llmStream);

      let sentenceBuffer = '';
      let sentenceIndex = 0;

      // Keep TTS jobs sequential so audio order is preserved
      let ttsChain: Promise<void> = Promise.resolve();
      let ttsError: unknown = null;

      const enqueue = (sentence: string) => {
        const idx = sentenceIndex++;

        ttsChain = ttsChain
          .then(() => {
            if (ttsError || signal.aborted) return; // skip queue sentence
            console.log(sentence);
            return this.streamTTS(client, voiceId, modelId, sentence, idx, runId,signal);
          })
          .catch((e) => {
            ttsError = e;
          });
      };

      for await (const token of llmStream) {
        if(signal.aborted) break;

        sentenceBuffer += token;

        if (/[.!?]\s*$/.test(sentenceBuffer) || sentenceBuffer.length > 120) {
          enqueue(sentenceBuffer.trim());
          sentenceBuffer = '';
        }
      }

      if (sentenceBuffer.trim()) {
        enqueue(sentenceBuffer.trim());
      }

      await ttsChain;
      if(signal.aborted) return client.emit('interrupted',{runId:runId});

      if (ttsError) throw ttsError;

      client.emit('done', { runId: runId });
    } catch (err) {
      if(signal.aborted) return;
      
      console.error(err);
      client.emit('error', {
        message: err instanceof Error ? err.message : 'Unknown error',
        runId:runId,
      });
    }
  }

  // Automatically call by NestJS when connection acomplished 
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // Automatically call by NestJs when connection close
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.cancelRun(client.id);
    this.geminiTranscript.close();

    // close cartesia connection
    this.closeCartesiaWs(client.id);
  }

}