import { ProjectEntity } from '../projects/persistence/project.entity';
import { TaskEntity } from '../tasks/persistence/task.entity';
import { UserEntity } from '../users/persistence/user.entity';

export const databaseEntities = [
  UserEntity,
  ProjectEntity,
  TaskEntity,
] as const;
