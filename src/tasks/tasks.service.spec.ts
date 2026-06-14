import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from '../projects/cache/project-detail-cache-invalidator';
import { ProjectStatus } from '../projects/domain/project-status.enum';
import { ProjectEntity } from '../projects/persistence/project.entity';
import { ProjectsService } from '../projects/projects.service';
import { TaskPriority } from './domain/task-priority.enum';
import { TaskStatus } from './domain/task-status.enum';
import { TaskEntity } from './persistence/task.entity';
import { TasksRepository } from './persistence/tasks.repository';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const projectsService = { requireOwnedProject: jest.fn() };
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findByIdAndProject: jest.fn(),
    findPaginatedByProject: jest.fn(),
    remove: jest.fn(),
  };
  const invalidator = { invalidate: jest.fn() };
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    projectsService.requireOwnedProject.mockResolvedValue(createProject());
    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: ProjectsService, useValue: projectsService },
        { provide: TasksRepository, useValue: repository },
        {
          provide: PROJECT_DETAIL_CACHE_INVALIDATOR,
          useValue: invalidator,
        },
      ],
    }).compile();
    service = module.get(TasksService);
  });

  it('authorizes the parent before creating and invalidates after save', async () => {
    const task = createTask();
    repository.create.mockReturnValue(task);
    repository.save.mockResolvedValue(task);

    await service.create('owner-id', 'project-id', { title: 'Task' });

    expect(projectsService.requireOwnedProject).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-id' }),
    );
    expect(invalidator.invalidate).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
  });

  it('stops before Task access when the Project is absent or cross-owner', async () => {
    projectsService.requireOwnedProject.mockRejectedValue(
      new NotFoundException('Project not found'),
    );

    await expect(
      service.get('other-owner', 'project-id', 'task-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByIdAndProject).not.toHaveBeenCalled();
  });

  it('lists only after parent authorization', async () => {
    repository.findPaginatedByProject.mockResolvedValue([[createTask()], 1]);

    const response = await service.list('owner-id', 'project-id', {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(projectsService.requireOwnedProject).toHaveBeenCalled();
    expect(repository.findPaginatedByProject).toHaveBeenCalledWith(
      'project-id',
      expect.any(Object),
    );
    expect(response.meta.totalPages).toBe(1);
  });

  it('rejects a Task routed through a different Project', async () => {
    repository.findByIdAndProject.mockResolvedValue(null);

    await expect(
      service.get('owner-id', 'other-project', 'task-id'),
    ).rejects.toThrow('Task not found');
    expect(repository.findByIdAndProject).toHaveBeenCalledWith(
      'task-id',
      'other-project',
    );
  });

  it('updates allowed fields and invalidates after persistence', async () => {
    const task = createTask();
    repository.findByIdAndProject.mockResolvedValue(task);
    repository.save.mockResolvedValue(task);

    await service.update('owner-id', 'project-id', 'task-id', {
      status: TaskStatus.Done,
      priority: TaskPriority.High,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TaskStatus.Done,
        priority: TaskPriority.High,
      }),
    );
    expect(invalidator.invalidate).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
  });

  it('deletes a Task and invalidates the parent Project detail', async () => {
    repository.findByIdAndProject.mockResolvedValue(createTask());
    repository.remove.mockResolvedValue(createTask());

    await service.delete('owner-id', 'project-id', 'task-id');

    expect(repository.remove).toHaveBeenCalled();
    expect(invalidator.invalidate).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
  });

  it.each([
    [
      'create',
      () => service.create('owner-id', 'project-id', { title: 'Task' }),
    ],
    [
      'update',
      () =>
        service.update('owner-id', 'project-id', 'task-id', {
          title: 'Updated',
        }),
    ],
    ['delete', () => service.delete('owner-id', 'project-id', 'task-id')],
  ])(
    'does not invalidate when %s persistence fails',
    async (operation, run) => {
      const failure = new Error(`${operation} failure`);
      repository.create.mockReturnValue(createTask());
      repository.findByIdAndProject.mockResolvedValue(createTask());
      repository.save.mockRejectedValue(failure);
      repository.remove.mockRejectedValue(failure);

      await expect(run()).rejects.toThrow(failure.message);
      expect(invalidator.invalidate).not.toHaveBeenCalled();
    },
  );
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
  } as ProjectEntity;
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
