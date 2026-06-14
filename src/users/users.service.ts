import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeEmail } from './email-normalizer';
import { UserEntity } from './persistence/user.entity';
import { UsersRepository } from './persistence/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(normalizeEmail(email));
  }

  async findByIdOrThrow(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserEntity> {
    try {
      return await this.usersRepository.create({
        ...input,
        email: normalizeEmail(input.email),
      });
    } catch (error) {
      if (this.usersRepository.isUniqueEmailViolation(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }
}
