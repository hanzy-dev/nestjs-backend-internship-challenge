import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtConfiguration } from './config/jwt.config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordHasherService } from './security/password-hasher.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = getJwtConfiguration(configService);

        return {
          secret: config.secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: config.expiresInSeconds,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasherService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
