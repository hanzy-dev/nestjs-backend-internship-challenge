import { DataSource, DeepPartial, EntityManager, EntityTarget } from 'typeorm';
import { PasswordHasherService } from '../../auth/security/password-hasher.service';
import { ProjectStatus } from '../../projects/domain/project-status.enum';
import { ProjectEntity } from '../../projects/persistence/project.entity';
import { TaskPriority } from '../../tasks/domain/task-priority.enum';
import { TaskStatus } from '../../tasks/domain/task-status.enum';
import { TaskEntity } from '../../tasks/persistence/task.entity';
import { UserEntity } from '../../users/persistence/user.entity';
import { DEMO_RESET_CONFIRMATION } from './demo-data.constants';
import { DemoDataService, DemoEnvironment } from './demo-data.service';

interface FakeStore {
  users: UserEntity[];
  projects: ProjectEntity[];
  tasks: TaskEntity[];
}

class FakePasswordHasher extends PasswordHasherService {
  override hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }
}

describe('DemoDataService', () => {
  const baseEnvironment: DemoEnvironment = {
    NODE_ENV: 'development',
    DATABASE_NAME: 'nestjs_challenge',
    DEMO_USER_PASSWORD: 'local-demo-password',
    CACHE_ENABLED: 'false',
  };

  it('rejects production execution', async () => {
    const { service } = createFixture();

    await expect(
      service.seed({ ...baseEnvironment, NODE_ENV: 'production' }),
    ).rejects.toThrow('production');
  });

  it('rejects seed without a password', async () => {
    const { service } = createFixture();

    await expect(
      service.seed({ ...baseEnvironment, DEMO_USER_PASSWORD: undefined }),
    ).rejects.toThrow('DEMO_USER_PASSWORD');
  });

  it('rejects reset without explicit confirmation', async () => {
    const { service } = createFixture();

    await expect(service.reset(baseEnvironment)).rejects.toThrow(
      'DEMO_RESET_CONFIRM',
    );
  });

  it('normalizes email, hashes the password, and creates deterministic records', async () => {
    const { service, store } = createFixture();
    const result = await service.seed({
      ...baseEnvironment,
      DEMO_USER_EMAIL: '  Demo.Backend@Example.Test  ',
    });

    expect(result.email).toBe('demo.backend@example.test');
    expect(result.projectCount).toBe(2);
    expect(result.taskCount).toBe(3);
    expect(store.users).toHaveLength(1);
    const demoUser = store.users[0];
    expect(demoUser).toBeDefined();
    expect(demoUser?.email).toBe('demo.backend@example.test');
    expect(demoUser?.passwordHash).toBe('hashed:local-demo-password');
    expect(demoUser?.passwordHash).not.toBe('local-demo-password');
    expect(store.projects.map((project) => project.name)).toEqual([
      'Internship Backend Challenge',
      'Evaluator Review Notes',
    ]);
    expect(store.tasks.map((task) => task.title)).toEqual([
      'Design database schema',
      'Implement JWT authentication',
      'Prepare API demonstration',
    ]);
  });

  it('keeps second seed deterministic', async () => {
    const { service, store } = createFixture();

    await service.seed(baseEnvironment);
    await service.seed(baseEnvironment);

    expect(store.users).toHaveLength(1);
    expect(store.projects).toHaveLength(2);
    expect(store.tasks).toHaveLength(3);
  });

  it('resets only demo-owned data and remains idempotent', async () => {
    const { service, store } = createFixture();
    const unrelatedUser = createUser('unrelated-user', 'other@example.test');
    const unrelatedProject = createProject(
      'unrelated-project',
      unrelatedUser.id,
    );
    const unrelatedTask = createTask('unrelated-task', unrelatedProject.id);
    store.users.push(unrelatedUser);
    store.projects.push(unrelatedProject);
    store.tasks.push(unrelatedTask);

    await service.seed(baseEnvironment);
    const firstReset = await service.reset({
      ...baseEnvironment,
      DEMO_RESET_CONFIRM: DEMO_RESET_CONFIRMATION,
    });
    const secondReset = await service.reset({
      ...baseEnvironment,
      DEMO_RESET_CONFIRM: DEMO_RESET_CONFIRMATION,
    });

    expect(firstReset.userDeleted).toBe(true);
    expect(firstReset.projectCount).toBe(2);
    expect(firstReset.taskCount).toBe(3);
    expect(secondReset.userDeleted).toBe(false);
    expect(store.users).toEqual([unrelatedUser]);
    expect(store.projects).toEqual([unrelatedProject]);
    expect(store.tasks).toEqual([unrelatedTask]);
  });

  it('closes the database connection naturally', async () => {
    const { service, dataSource } = createFixture();

    await service.close();

    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });

  it('does not expose password, hash, token, or secret values in seed result', async () => {
    const { service } = createFixture();
    const result = await service.seed(baseEnvironment);
    const serializedResult = JSON.stringify(result);

    expect(serializedResult).not.toContain('local-demo-password');
    expect(serializedResult).not.toContain('hashed:');
    expect(serializedResult).not.toContain('token');
    expect(serializedResult).not.toContain('secret');
  });
});

function createFixture(currentDatabase = 'nestjs_challenge'): {
  service: DemoDataService;
  store: FakeStore;
  dataSource: Pick<DataSource, 'destroy'>;
} {
  const store: FakeStore = {
    users: [],
    projects: [],
    tasks: [],
  };
  let userSequence = 1;
  let projectSequence = 1;
  let taskSequence = 1;

  const manager = {
    create<T>(target: EntityTarget<T>, entity: DeepPartial<T>): T {
      if (target === UserEntity) {
        return {
          id: `demo-user-${userSequence++}`,
          ...entity,
        } as T;
      }
      if (target === ProjectEntity) {
        return {
          id: `demo-project-${projectSequence++}`,
          ...entity,
        } as T;
      }
      return {
        id: `demo-task-${taskSequence++}`,
        ...entity,
      } as T;
    },
    save<T>(targetOrEntity: EntityTarget<T> | T, entity?: T): Promise<T> {
      const value = entity ?? (targetOrEntity as T);
      if (isUser(value)) {
        upsertById(store.users, value);
      } else if (isProject(value)) {
        upsertById(store.projects, value);
      } else if (isTask(value)) {
        upsertById(store.tasks, value);
      }
      return Promise.resolve(value);
    },
    findOne(
      target: EntityTarget<UserEntity>,
      options: { where: { email: string } },
    ): Promise<UserEntity | null> {
      if (target !== UserEntity) {
        return Promise.resolve(null);
      }
      return Promise.resolve(
        store.users.find((user) => user.email === options.where.email) ?? null,
      );
    },
    find(
      target: EntityTarget<ProjectEntity>,
      options: { where: { ownerId: string } },
    ): Promise<ProjectEntity[]> {
      if (target !== ProjectEntity) {
        return Promise.resolve([]);
      }
      return Promise.resolve(
        store.projects.filter(
          (project) => project.ownerId === options.where.ownerId,
        ),
      );
    },
    delete(
      target: EntityTarget<UserEntity | ProjectEntity>,
      criteria: { id?: string; ownerId?: string },
    ): Promise<{ affected: number }> {
      if (target === UserEntity && criteria.id) {
        return Promise.resolve(
          deleteWhere(store.users, (user) => user.id === criteria.id),
        );
      }
      if (target === ProjectEntity && criteria.ownerId) {
        return Promise.resolve(
          deleteWhere(
            store.projects,
            (project) => project.ownerId === criteria.ownerId,
          ),
        );
      }
      return Promise.resolve({ affected: 0 });
    },
    createQueryBuilder(): {
      delete(): {
        from(): {
          where(
            statement: string,
            parameters: { projectIds: string[] },
          ): { execute(): Promise<{ affected: number }> };
        };
      };
    } {
      return {
        delete: () => ({
          from: () => ({
            where: (_statement, parameters) => ({
              execute: () =>
                Promise.resolve(
                  deleteWhere(store.tasks, (task) =>
                    parameters.projectIds.includes(task.projectId),
                  ),
                ),
            }),
          }),
        }),
      };
    },
  } as unknown as EntityManager;

  const dataSource = {
    isInitialized: true,
    query: jest.fn().mockResolvedValue([{ name: currentDatabase }]),
    transaction: jest.fn(
      async <T>(callback: (entityManager: EntityManager) => Promise<T>) =>
        callback(manager),
    ),
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new DemoDataService(
      dataSource as unknown as DataSource,
      new FakePasswordHasher(),
    ),
    store,
    dataSource,
  };
}

function createUser(id: string, email: string): UserEntity {
  return {
    id,
    name: 'Other User',
    email,
    passwordHash: 'hashed:other',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: [],
  };
}

function createProject(id: string, ownerId: string): ProjectEntity {
  return {
    id,
    ownerId,
    name: 'Other Project',
    description: null,
    status: ProjectStatus.Active,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    owner: createUser(ownerId, 'other@example.test'),
    tasks: [],
  };
}

function createTask(id: string, projectId: string): TaskEntity {
  return {
    id,
    projectId,
    title: 'Other Task',
    description: null,
    status: TaskStatus.Todo,
    priority: TaskPriority.Medium,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    project: createProject(projectId, 'unrelated-user'),
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T): void {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) {
    items.push(item);
    return;
  }
  items[index] = item;
}

function deleteWhere<T>(
  items: T[],
  predicate: (item: T) => boolean,
): {
  affected: number;
} {
  const retained = items.filter((item) => !predicate(item));
  const affected = items.length - retained.length;
  items.splice(0, items.length, ...retained);
  return { affected };
}

function isUser(value: unknown): value is UserEntity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'email' in value &&
    'passwordHash' in value
  );
}

function isProject(value: unknown): value is ProjectEntity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ownerId' in value &&
    'name' in value &&
    !('passwordHash' in value)
  );
}

function isTask(value: unknown): value is TaskEntity {
  return (
    typeof value === 'object' &&
    value !== null &&
    'projectId' in value &&
    'title' in value
  );
}
