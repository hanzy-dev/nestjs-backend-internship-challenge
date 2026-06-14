import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOneBy({ email });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserEntity> {
    return this.repository.save(this.repository.create(input));
  }

  isUniqueEmailViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;

    return (
      isRecord(driverError) &&
      driverError.code === '23505' &&
      driverError.constraint === 'UQ_users_email'
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
