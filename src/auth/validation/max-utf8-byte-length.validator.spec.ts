import { validate } from 'class-validator';
import { MaxUtf8ByteLength } from './max-utf8-byte-length.validator';

class PasswordInput {
  @MaxUtf8ByteLength(72)
  password!: string;
}

describe('MaxUtf8ByteLength', () => {
  it('accepts a password within the bcrypt byte limit', async () => {
    const input = new PasswordInput();
    input.password = 'a'.repeat(72);

    await expect(validate(input)).resolves.toHaveLength(0);
  });

  it('rejects a multibyte password beyond the bcrypt byte limit', async () => {
    const input = new PasswordInput();
    input.password = 'é'.repeat(37);

    const errors = await validate(input);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints?.maxUtf8ByteLength).toContain(
      '72 UTF-8 bytes',
    );
  });
});
