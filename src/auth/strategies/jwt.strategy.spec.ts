import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserEntity } from '../../users/persistence/user.entity';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const usersService = { findByIdOrThrow: jest.fn() };
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: usersService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === 'JWT_SECRET'
                ? 'test-only-secret-with-at-least-32-characters'
                : 900,
          },
        },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
  });

  it('returns a safe authenticated-user context', async () => {
    usersService.findByIdOrThrow.mockResolvedValue(createUser());

    await expect(
      strategy.validate({ sub: '75b2c04a-0313-4ced-b45c-168080ebc66f' }),
    ).resolves.toEqual({
      id: '75b2c04a-0313-4ced-b45c-168080ebc66f',
      name: 'Example User',
      email: 'user@example.com',
    });
  });

  it('rejects a malformed subject', async () => {
    await expect(strategy.validate({ sub: 'not-a-uuid' })).rejects.toThrow(
      'Invalid access token',
    );
  });

  it('rejects a token for a missing user', async () => {
    usersService.findByIdOrThrow.mockRejectedValue(new Error('missing'));

    await expect(
      strategy.validate({ sub: '75b2c04a-0313-4ced-b45c-168080ebc66f' }),
    ).rejects.toThrow('Invalid access token');
  });
});

function createUser(): UserEntity {
  return {
    id: '75b2c04a-0313-4ced-b45c-168080ebc66f',
    name: 'Example User',
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: [],
  };
}
