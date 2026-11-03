import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

export type TranscriptEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'speech-start' }
  | { type: 'speech-end' };

@Injectable()
export class GeminiTranscribeServiceLive {
  private logger = new Logger(GeminiTranscribeServiceLive.name);
  private geminiWs: WebSocket | null = null;
  private apiKey: string;
  private model:string;

  constructor(private configService: ConfigService) {
    // Retrieve your secret API key safely from environment variables
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.model = this.configService.get<string>('GEMINI_3_5_TRANSCRIBE_LIVE') || 'gemini-3.5-transcribe-live';
  }

  /**
   * Connects to Gemini Live API and registers a callback to handle extracted text
   */
  public connectToGemini(clientId:string,onEvent:(e:TranscriptEvent)=>void): Promise<void> {
    return new Promise((resolve, reject) => {
      const host = 'generativelanguage.googleapis.com';
      const url = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      this.geminiWs = new WebSocket(url);
      if(!this.geminiWs) return reject({message:'Unable to create Gemini Ws'});

      this.geminiWs.on('open', () => {
        this.logger.log('Connected to Gemini Live API upstream.');
        this.sendSetupPayload();
      });

      this.geminiWs.on('message', (data: WebSocket.Data) => {
        const msg = JSON.parse(data.toString());
        this.logger.log(msg);
        if (msg.setupComplete) {
            return resolve();
        } 

        const sc = msg.serverContent;

        if (sc?.interimInputTranscription?.text) {
        onEvent({ type: 'interim', text: sc.interimInputTranscription.text });
        }

        if (sc?.inputTranscription?.text) {
            onEvent({ type: 'final', text: sc.inputTranscription.text });
        }

        const vad = msg.voiceActivity?.type;
        if (vad === 'ACTIVITY_START') onEvent({ type: 'speech-start' });
        if (vad === 'ACTIVITY_END') onEvent({ type: 'speech-end' });

      });

      this.geminiWs.on('error', (error) => {
        this.logger.error('Gemini WS Error:', error);
        reject(error);
      });

      this.geminiWs.on('close', (code, reason) => {
        this.logger.warn(`Gemini WS closed: ${code} - ${reason.toString()}`);
      });
    });
  }

  /**
   * Step 1: Send configurat tion payload telling Gemini we expect text response/transcriptions
   */
  private sendSetupPayload() {
    if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ['TEXT'], // Requesting text back only
        },
        inputAudioTranscription: {
            languageCodes: ['km', 'en'], // Empty means automatic language detection
        },
      },
    };

    this.geminiWs.send(JSON.stringify(setupMessage));
    this.logger.log('Sent Gemini setup configuration.');
  }

  /**
   * Step 2: Forward client's raw audio chunks upstream to Google
   */
  public sendAudioChunk(pcmBuffer: Buffer) {
      this.logger.log('Audio chunk is received.');
      if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

      const audioMessage = {
          realtimeInput: {
          audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: pcmBuffer.toString('base64'),
          },
          }
      };

      this.geminiWs.send(JSON.stringify(audioMessage));
  }

  /**
   * Clean up connection when client drops
   */
  public close() {
    if (this.geminiWs) {
      this.geminiWs.close();
      this.geminiWs = null;
    }
  }
}