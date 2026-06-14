import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '../../users/email-normalizer';
import { MaxUtf8ByteLength } from '../validation/max-utf8-byte-length.validator';

export class RegisterDto {
  @ApiProperty({ minLength: 2, maxLength: 120, example: 'Hanzy Developer' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    format: 'email',
    maxLength: 254,
    example: 'hanzy@example.com',
  })
  @Transform(({ value }: TransformFnParams) => normalizeEmailValue(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    format: 'password',
    example: 'example-password-123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8ByteLength(72)
  password!: string;
}

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? normalizeEmail(value) : value;
}
