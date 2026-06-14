import { TransformFnParams } from 'class-transformer';

export function toOptionalInteger({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string' || value.trim() === '') {
    return value;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}
