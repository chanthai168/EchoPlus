import { Body, Controller, Logger, Post, Res, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { PromptDTO } from './dto/prompt.dto.js';
import { GeminiCallService } from './geminiCall.service.js';
import { LoggingInterceptor } from '../../common/interceptors/Logging.interceptor.js';
import { resolve } from 'node:path';

const uploadDirectory = resolve(process.cwd(), 'uploads');

@UseInterceptors(LoggingInterceptor)
@Controller('gemini')
export class GeminiCallController {
  private readonly logger = new Logger(GeminiCallController.name);

  constructor(private readonly ai: GeminiCallService) {}

  @Post('stream')
  async streamAI(@Body() dto: PromptDTO, @Res() res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.ai.streamAiMock(dto.prompt)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } 
    } catch (error) {
      this.logger.error(
        'Gemini streaming request failed',
        this.formatErrorChain(error),
      );
      res.write(
        `event: error\ndata: ${JSON.stringify('Gemini request failed.')}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  private formatErrorChain(error: unknown): string {
    const details: string[] = [];
    const seen = new Set<unknown>();
    let current: unknown = error;

    while (current && !seen.has(current)) {
      seen.add(current);
      if (current instanceof Error) {
        details.push(current.stack ?? `${current.name}: ${current.message}`);
        current = current.cause;
      } else {
        details.push(String(current));
        break;
      }
    }

    return details.join('\nCaused by: ');
  }
}