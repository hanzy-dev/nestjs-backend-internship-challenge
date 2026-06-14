import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorResponses,
  ApiRequestIdHeader,
  ApiTypedResponse,
} from '../docs/swagger.decorators';
import { AuthResponseModel, UserResponseModel } from '../docs/swagger.models';
import { UserResponse } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponse } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user';

@Controller('auth')
@ApiTags('Authentication')
@ApiRequestIdHeader()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Mendaftarkan pengguna baru' })
  @ApiBody({ type: RegisterDto })
  @ApiTypedResponse(201, 'Pengguna berhasil dibuat.', UserResponseModel)
  @ApiErrorResponses(
    { status: 400, description: 'Payload registrasi tidak valid.' },
    { status: 409, description: 'Email sudah terdaftar.' },
    { status: 413, description: 'Request body terlalu besar.' },
    { status: 429, description: 'Batas request authentication terlampaui.' },
  )
  register(@Body() input: RegisterDto): Promise<UserResponse> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Login dan menerbitkan JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiTypedResponse(200, 'Login berhasil.', AuthResponseModel)
  @ApiErrorResponses(
    { status: 400, description: 'Payload login tidak valid.' },
    { status: 401, description: 'Credential tidak valid.' },
    { status: 413, description: 'Request body terlalu besar.' },
    { status: 429, description: 'Batas request authentication terlampaui.' },
  )
  login(@Body() input: LoginDto): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Mengambil profil pengguna terautentikasi' })
  @ApiTypedResponse(200, 'Profil pengguna saat ini.', UserResponseModel)
  @ApiResponse({ status: 401, description: 'Bearer token tidak valid.' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.authService.getCurrentUser(user.id);
  }
}
