import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class TranscriptionModeConfigDto {
  @ApiPropertyOptional({
    example: 'verbatim',
    description: 'Mode identifier. Must be set to verbatim.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['verbatim'])
  type?: 'verbatim';

  @ApiPropertyOptional({
    example: ['word'],
    description: 'Granularity of timestamps to return.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timestamp_granularities?: ('word')[];

  @ApiPropertyOptional({
    example: 'speaker',
    description: 'Diarization mode to identify and label distinct speakers.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['speaker'])
  diarization_mode?: 'speaker';
}