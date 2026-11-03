import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { MessageService } from "./message.service.js";
import { MessageRole } from "../../generated/prisma/enums.js";
import { CharacterService } from "../character/character.service.js";

@Injectable()
export class GeminiCallService {
    private readonly ai: GoogleGenAI;
    private readonly model: string;

    constructor(private readonly config: ConfigService,
                private readonly messageService:MessageService,
                private readonly characterService:CharacterService,
    ) {
        const apiKey = config.get<string>('GEMINI_API_KEY');
        this.model = config.get<string>('GEMINI_MODEL') ?? 'gemini-3.8-flash';
        
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async *streamAi(prompt: string,systemPrompt:string,signal?:AbortSignal): AsyncGenerator<string> {

        await this.messageService.saveMessage(MessageRole.User,prompt,"abc123");

        const messages = await this.messageService.retrieveMessage("abc123",5);

        let fullResponseText = "";

        const responseStream = await this.ai.models.generateContentStream(
            {
                model: this.model,
                contents: messages.messages,
                config: {
                    systemInstruction: systemPrompt ?? this.characterService.getCharacterSysPrompt("mikasa")?.systemPrompt,
                    abortSignal:signal,
                },
                
            },
            
        );

        for await (const chunk of responseStream) {
                        const text = chunk.text;
                        if (text) {
                            fullResponseText += text;
                            yield text;
                        }
                    }

        await this.messageService.saveMessage(MessageRole.Model,fullResponseText,"abc123");

    }

    async *streamAiMock(prompt: string) {
        const words = `I always love you as you are.`.repeat(1).split(' ');
        for (const word of words) {
        await new Promise((r) => setTimeout(r, 80)); // simulate latency
        yield word + ' ' ;
    }}
    
}