import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '../projects/domain/project-status.enum';
import { TaskPriority } from '../tasks/domain/task-priority.enum';
import { TaskStatus } from '../tasks/domain/task-status.enum';

export class UserResponseModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Demo User' })
  name!: string;

  @ApiProperty({ format: 'email', example: 'hanzy@example.com' })
  email!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AuthResponseModel {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseModel })
  user!: UserResponseModel;
}

export class TaskResponseModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ example: 'Implement endpoint' })
  title!: string;

  @ApiProperty({ nullable: true, example: 'Add validation and tests' })
  description!: string | null;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.Todo })
  status!: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.Medium })
  priority!: TaskPriority;

  @ApiProperty({ format: 'date-time', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProjectResponseModel {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Backend Internship Challenge' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'NestJS REST API' })
  description!: string | null;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.Active })
  status!: ProjectStatus;

  @ApiProperty({ format: 'date-time', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProjectDetailResponseModel extends ProjectResponseModel {
  @ApiProperty({ type: [TaskResponseModel] })
  tasks!: TaskResponseModel[];
}

export class PaginationMetaModel {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalItems!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedProjectsResponseModel {
  @ApiProperty({ type: [ProjectResponseModel] })
  data!: ProjectResponseModel[];

  @ApiProperty({ type: PaginationMetaModel })
  meta!: PaginationMetaModel;
}

export class PaginatedTasksResponseModel {
  @ApiProperty({ type: [TaskResponseModel] })
  data!: TaskResponseModel[];

  @ApiProperty({ type: PaginationMetaModel })
  meta!: PaginationMetaModel;
}

export class ApiErrorResponseModel {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Request validation failed' })
  message!: string;

  @ApiProperty({ type: Object })
  details!: Record<string, unknown>;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/projects' })
  path!: string;

  @ApiProperty({ example: 'client-request-123' })
  requestId!: string;
}

export class LivenessResponseModel {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';
}

export class ReadinessResponseModel {
  @ApiProperty({ example: 'ready' })
  status!: 'ready';

  @ApiProperty({ example: 'up' })
  database!: 'up';
}
