import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalInteger } from '../../common/dto/query-transforms';
import type { SortOrder } from '../../projects/dto/list-projects-query.dto';
import { TaskPriority } from '../domain/task-priority.enum';
import { TaskStatus } from '../domain/task-status.enum';

export const TASK_SORT_FIELDS = [
  'title',
  'status',
  'priority',
  'createdAt',
  'updatedAt',
  'dueDate',
] as const;

export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export class ListTasksQueryDto {
  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsIn(TASK_SORT_FIELDS)
  sortBy: TaskSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
