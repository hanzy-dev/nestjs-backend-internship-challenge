import { PaginatedResponse } from '../../common/dto/pagination-meta.dto';
import { TaskPriority } from '../domain/task-priority.enum';
import { TaskStatus } from '../domain/task-status.enum';

export interface TaskResponse {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedTasksResponse = PaginatedResponse<TaskResponse>;
