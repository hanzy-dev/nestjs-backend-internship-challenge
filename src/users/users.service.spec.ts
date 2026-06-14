import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersRepository } from './persistence/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const repository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    isUniqueEmailViolation: jest.fn(),
  };
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('normalizes email lookups', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await service.findByEmail(' User@Example.COM ');

    expect(repository.findByEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('normalizes email during creation', async () => {
    repository.create.mockImplementation((input: object) =>
      Promise.resolve(input),
    );

    await service.create({
      name: 'Example',
      email: ' User@Example.COM ',
      passwordHash: 'hash',
    });

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Example',
      email: 'user@example.com',
      passwordHash: 'hash',
    });
  });

  it('maps unique-email violations to a safe conflict', async () => {
    const databaseError = new Error('private database error');
    repository.create.mockRejectedValue(databaseError);
    repository.isUniqueEmailViolation.mockReturnValue(true);

    await expect(
      service.create({
        name: 'Example',
        email: 'user@example.com',
        passwordHash: 'hash',
      }),
    ).rejects.toEqual(new ConflictException('Email is already registered'));
  });

  it('throws safe not-found behavior for a missing user', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findByIdOrThrow('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
