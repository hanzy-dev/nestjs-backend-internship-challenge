import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../users/email-normalizer';
import { MaxUtf8ByteLength } from '../validation/max-utf8-byte-length.validator';

export class LoginDto {
  @Transform(({ value }: TransformFnParams) => normalizeEmailValue(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @MaxUtf8ByteLength(72)
  password!: string;
}

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? normalizeEmail(value) : value;
}
