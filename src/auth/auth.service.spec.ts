import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserEntity } from '../users/persistence/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordHasherService } from './security/password-hasher.service';

describe('AuthService', () => {
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByIdOrThrow: jest.fn(),
  };
  const passwordHasher = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: PasswordHasherService, useValue: passwordHasher },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              key === 'JWT_EXPIRES_IN_SECONDS' ? 900 : 'test-secret',
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('registers with a hash and returns a safe user', async () => {
    const user = createUser();
    passwordHasher.hash.mockResolvedValue('secure-hash');
    usersService.create.mockResolvedValue(user);

    const response = await service.register({
      name: 'Example User',
      email: 'user@example.com',
      password: 'plaintext-password',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('plaintext-password');
    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Example User',
      email: 'user@example.com',
      passwordHash: 'secure-hash',
    });
    expect(response).not.toHaveProperty('passwordHash');
  });

  it('logs in with valid credentials and signs only the subject', async () => {
    const user = createUser();
    usersService.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    const response = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: user.id });
    expect(response).toMatchObject({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it.each([
    ['unknown email', null, false],
    ['wrong password', createUser(), false],
  ])('uses one safe error for %s', async (_case, user, matches) => {
    usersService.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(matches);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'incorrect-password',
      }),
    ).rejects.toThrow('Invalid email or password');
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
