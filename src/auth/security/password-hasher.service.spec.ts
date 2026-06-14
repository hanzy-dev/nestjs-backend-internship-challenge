import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('hashes and verifies a password without retaining plaintext', async () => {
    const hash = await service.hash('correct-password');

    expect(hash).not.toBe('correct-password');
    await expect(service.compare('correct-password', hash)).resolves.toBe(true);
    await expect(service.compare('wrong-password', hash)).resolves.toBe(false);
  });
});
