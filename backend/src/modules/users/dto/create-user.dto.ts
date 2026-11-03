import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, MaxLength,IsEnum } from 'class-validator';
import { Role } from '../../../generated/prisma/enums.js';

export class CreateUserDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address (must be unique)'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsString()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ 
    example: 'John Doe',
    description: 'User full name (optional)'
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;


  @ApiProperty({ 
    description: 'Please use strong password including Capital letter, letter, Number, Special character and at lease 8 letter'
  })
  @IsString()
  @MaxLength(32)
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
    description: 'User role (defaults to USER if omitted)',
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be one of: USER, ADMIN, MODERATOR' })
  role!: Role;

}