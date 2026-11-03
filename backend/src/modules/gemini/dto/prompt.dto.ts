import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {MaxLength,IsString } from 'class-validator';

export class PromptDTO {
  @ApiProperty({ 
    example: 'Explain what is javascript in one line.',
  })
  @IsString()
  prompt!: string;
}