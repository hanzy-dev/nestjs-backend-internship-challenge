import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../common/dto/string-transforms';
import { TaskPriority } from '../domain/task-priority.enum';
import { TaskStatus } from '../domain/task-status.enum';

export class UpdateTaskDto {
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}
