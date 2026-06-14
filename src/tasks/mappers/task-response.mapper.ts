import { TaskResponse } from '../dto/task-response.dto';
import { TaskEntity } from '../persistence/task.entity';

export function mapTaskResponse(task: TaskEntity): TaskResponse {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
