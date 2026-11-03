import { Global, Module } from '@nestjs/common';
import { GeminiCallService } from './geminiCall.service.js';
import { GeminiCallController } from './geminiCall.controller.js';
import { GeminiTranscribeServiceLive } from './gemini-transcribe-live.service.js';
import { MessageService } from './message.service.js';
import { CharacterModule } from '../character/character.module.js';

@Global()
@Module({
  imports: [CharacterModule],
  providers: [GeminiCallService,GeminiTranscribeServiceLive,MessageService],
  exports: [GeminiCallService,GeminiTranscribeServiceLive],
  controllers: [GeminiCallController],
})
export class geminiCallModule {}
