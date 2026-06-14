import { PaginatedResponse } from '../../common/dto/pagination-meta.dto';
import { TaskResponse } from '../../tasks/dto/task-response.dto';
import { ProjectStatus } from '../domain/project-status.enum';

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDetailResponse extends ProjectResponse {
  tasks: TaskResponse[];
}

export type PaginatedProjectsResponse = PaginatedResponse<ProjectResponse>;
