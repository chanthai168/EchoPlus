import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TranscriptionModeConfigDto } from './transcription-mode-config.dto.js';

export class TranscriptionConfigOptionsDto {
  @ApiPropertyOptional({
    example: ['en-US', 'km-KH'],
    description: 'BCP-47 language codes for speech recognition.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  language_codes?: string[];

  @ApiPropertyOptional({
    example: ['Gemini', 'Kubernetes', 'BigQuery'],
    description: 'Custom vocabulary terms to bias speech recognition (up to 1,000 terms).',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  custom_vocabulary?: string[];

  @ApiPropertyOptional({
    example: 'smart',
    description: 'Transcription mode: either "smart" string or a verbatim configuration object.',
    oneOf: [
      { type: 'string', example: 'smart' },
      { $ref: '#/components/schemas/TranscriptionModeConfigDto' },
    ],
  })
  @IsOptional()
  @ValidateIf((config: TranscriptionConfigOptionsDto) => config.mode !== 'smart')
  @ValidateNested()
  @Type(() => TranscriptionModeConfigDto)
  mode?: 'smart' | TranscriptionModeConfigDto;
}