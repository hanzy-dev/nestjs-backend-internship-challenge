import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: PROJECT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PROJECT_SORT_FIELDS)
  sortBy: ProjectSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
