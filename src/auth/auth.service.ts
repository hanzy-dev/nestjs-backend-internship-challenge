import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mapUserResponse } from '../users/mappers/user-response.mapper';
import { UsersService } from '../users/users.service';
import { getJwtConfiguration } from './config/jwt.config';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload';
import { PasswordHasherService } from './security/password-hasher.service';
import { ConfigService } from '@nestjs/config';
import { UserResponse } from '../users/dto/user-response.dto';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  private readonly expiresInSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.expiresInSeconds = getJwtConfiguration(configService).expiresInSeconds;
  }

  async register(input: RegisterDto): Promise<UserResponse> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.usersService.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return mapUserResponse(user);
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);

    if (
      !user ||
      !(await this.passwordHasher.compare(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload: JwtPayload = { sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user: mapUserResponse(user),
    };
  }

  async getCurrentUser(id: string): Promise<UserResponse> {
    return mapUserResponse(await this.usersService.findByIdOrThrow(id));
  }
}
