import { normalizeEmail } from './email-normalizer';

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases the address', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('preserves plus aliases and dots', () => {
    expect(normalizeEmail('First.Last+tag@Example.com')).toBe(
      'first.last+tag@example.com',
    );
  });
});
