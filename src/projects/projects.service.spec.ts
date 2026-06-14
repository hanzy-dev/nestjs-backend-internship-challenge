import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from './cache/project-detail-cache-invalidator';
import { ProjectStatus } from './domain/project-status.enum';
import { ProjectEntity } from './persistence/project.entity';
import { ProjectsRepository } from './persistence/projects.repository';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findByIdAndOwner: jest.fn(),
    findDetailByIdAndOwner: jest.fn(),
    findPaginatedByOwner: jest.fn(),
    remove: jest.fn(),
  };
  const invalidator = { invalidate: jest.fn() };
  let service: ProjectsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: repository },
        {
          provide: PROJECT_DETAIL_CACHE_INVALIDATOR,
          useValue: invalidator,
        },
      ],
    }).compile();
    service = module.get(ProjectsService);
  });

  it('creates a Project using the authenticated owner ID', async () => {
    const project = createProject();
    repository.create.mockReturnValue(project);
    repository.save.mockResolvedValue(project);

    await service.create('owner-id', {
      name: 'Project',
      status: ProjectStatus.Active,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-id', name: 'Project' }),
    );
  });

  it('lists only through the owner-scoped repository query', async () => {
    repository.findPaginatedByOwner.mockResolvedValue([[createProject()], 1]);

    const response = await service.list('owner-id', {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(repository.findPaginatedByOwner).toHaveBeenCalledWith(
      'owner-id',
      expect.any(Object),
    );
    expect(response.meta.totalItems).toBe(1);
  });

  it('treats absent and cross-owner Projects as not found', async () => {
    repository.findByIdAndOwner.mockResolvedValue(null);

    await expect(
      service.requireOwnedProject('other-owner', 'project-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns Project Detail through the joined owner-scoped query', async () => {
    repository.findDetailByIdAndOwner.mockResolvedValue(createProject());

    await service.getDetail('owner-id', 'project-id');

    expect(repository.findDetailByIdAndOwner).toHaveBeenCalledWith(
      'project-id',
      'owner-id',
    );
  });

  it('updates allowed fields and invalidates after persistence', async () => {
    const project = createProject();
    repository.findByIdAndOwner.mockResolvedValue(project);
    repository.save.mockResolvedValue(project);

    await service.update('owner-id', 'project-id', {
      name: 'Updated',
      status: ProjectStatus.Completed,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated',
        status: ProjectStatus.Completed,
      }),
    );
    expect(invalidator.invalidate).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
    expect(repository.save.mock.invocationCallOrder[0]!).toBeLessThan(
      invalidator.invalidate.mock.invocationCallOrder[0]!,
    );
  });

  it('does not invalidate when an update fails', async () => {
    repository.findByIdAndOwner.mockResolvedValue(createProject());
    repository.save.mockRejectedValue(new Error('database failure'));

    await expect(
      service.update('owner-id', 'project-id', { name: 'Updated' }),
    ).rejects.toThrow('database failure');
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });

  it('deletes an owned Project and invalidates afterward', async () => {
    repository.findByIdAndOwner.mockResolvedValue(createProject());
    repository.remove.mockResolvedValue(createProject());

    await service.delete('owner-id', 'project-id');

    expect(repository.remove).toHaveBeenCalled();
    expect(invalidator.invalidate).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
    );
  });

  it('does not invalidate when deletion fails', async () => {
    repository.findByIdAndOwner.mockResolvedValue(createProject());
    repository.remove.mockRejectedValue(new Error('database failure'));

    await expect(service.delete('owner-id', 'project-id')).rejects.toThrow(
      'database failure',
    );
    expect(invalidator.invalidate).not.toHaveBeenCalled();
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
