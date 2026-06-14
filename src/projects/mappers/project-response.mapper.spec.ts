import { ProjectStatus } from '../domain/project-status.enum';
import { ProjectEntity } from '../persistence/project.entity';
import {
  mapProjectDetailResponse,
  mapProjectResponse,
} from './project-response.mapper';
import { TaskEntity } from '../../tasks/persistence/task.entity';
import { TaskStatus } from '../../tasks/domain/task-status.enum';
import { TaskPriority } from '../../tasks/domain/task-priority.enum';

describe('project response mappers', () => {
  it('returns safe fields without owner or User data', () => {
    const response = mapProjectResponse(createProject());

    expect(response).toMatchObject({
      id: 'project-id',
      name: 'Project',
      status: ProjectStatus.Active,
    });
    expect(response).not.toHaveProperty('ownerId');
    expect(response).not.toHaveProperty('owner');
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });

  it('maps Project Detail with its Tasks', () => {
    const project = createProject();
    project.tasks = [createTask()];

    const response = mapProjectDetailResponse(project);

    expect(response.tasks).toHaveLength(1);
    expect(response.tasks[0]).toMatchObject({
      id: 'task-id',
      projectId: 'project-id',
    });
  });
});

function createProject(): ProjectEntity {
  return {
    id: 'project-id',
    ownerId: 'owner-id',
    name: 'Project',
    description: null,
    status: ProjectStatus.Active,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    owner: {
      id: 'owner-id',
      name: 'Owner',
      email: 'owner@example.com',
      passwordHash: 'private-hash',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      projects: [],
    },
    tasks: [],
  };
}

function createTask(): TaskEntity {
  return {
    id: 'task-id',
    projectId: 'project-id',
    title: 'Task',
    description: null,
    status: TaskStatus.Todo,
    priority: TaskPriority.Medium,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  } as TaskEntity;
}
