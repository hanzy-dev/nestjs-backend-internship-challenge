import { ProjectEntity } from '../persistence/project.entity';
import {
  ProjectDetailResponse,
  ProjectResponse,
} from '../dto/project-response.dto';
import { mapTaskResponse } from '../../tasks/mappers/task-response.mapper';

export function mapProjectResponse(project: ProjectEntity): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    dueDate: project.dueDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function mapProjectDetailResponse(
  project: ProjectEntity,
): ProjectDetailResponse {
  return {
    ...mapProjectResponse(project),
    tasks: (project.tasks ?? []).map(mapTaskResponse),
  };
}
