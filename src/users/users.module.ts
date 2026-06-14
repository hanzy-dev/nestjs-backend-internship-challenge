import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './persistence/user.entity';
import { UsersRepository } from './persistence/users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
