import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { trimString } from '../../common/dto/string-transforms';
import { ProjectStatus } from '../domain/project-status.enum';

export class CreateProjectDto {
  @ApiProperty({ minLength: 1, maxLength: 160, example: 'Backend API' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 2000,
    nullable: true,
    example: 'NestJS internship challenge',
  })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.Active })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}
