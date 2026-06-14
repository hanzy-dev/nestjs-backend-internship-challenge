import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

const BCRYPT_WORK_FACTOR = 10;

@Injectable()
export class PasswordHasherService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_WORK_FACTOR);
  }

  compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
