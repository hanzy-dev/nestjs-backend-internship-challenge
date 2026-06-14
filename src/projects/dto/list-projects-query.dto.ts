import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalInteger } from '../../common/dto/query-transforms';
import { ProjectStatus } from '../domain/project-status.enum';

export const PROJECT_SORT_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
  'dueDate',
] as const;

export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export class ListProjectsQueryDto {
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
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsIn(PROJECT_SORT_FIELDS)
  sortBy: ProjectSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
