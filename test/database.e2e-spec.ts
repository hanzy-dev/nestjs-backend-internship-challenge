import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ProjectStatus } from '../src/projects/domain/project-status.enum';
import { ProjectEntity } from '../src/projects/persistence/project.entity';
import { TaskPriority } from '../src/tasks/domain/task-priority.enum';
import { TaskStatus } from '../src/tasks/domain/task-status.enum';
import { TaskEntity } from '../src/tasks/persistence/task.entity';
import { UserEntity } from '../src/users/persistence/user.entity';
import {
  cleanTestDatabase,
  getCurrentDatabase,
} from './helpers/database-cleaner';
import { createDatabaseTestApplication } from './helpers/create-test-app';
import { runTestMigrations } from './helpers/database-migrations';

describe('Database foundation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let users: Repository<UserEntity>;
  let projects: Repository<ProjectEntity>;
  let tasks: Repository<TaskEntity>;

  beforeAll(async () => {
    const testApplication = await createDatabaseTestApplication();
    app = testApplication.app;
    dataSource = testApplication.dataSource;

    await runTestMigrations(dataSource);
    expect(await getCurrentDatabase(dataSource)).toBe(
      process.env.DATABASE_TEST_NAME,
    );

    users = dataSource.getRepository(UserEntity);
    projects = dataSource.getRepository(ProjectEntity);
    tasks = dataSource.getRepository(TaskEntity);
  });

  beforeEach(async () => {
    await cleanTestDatabase(dataSource);
  });

  afterAll(async () => {
    await cleanTestDatabase(dataSource);
    await app.close();
    expect(dataSource.isInitialized).toBe(false);
  });

  it('runs the initial migration and exposes the expected tables', async () => {
    const tables: unknown = await dataSource.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename IN ('users', 'projects', 'tasks')
       ORDER BY tablename`,
    );

    expect(tables).toEqual([
      { tablename: 'projects' },
      { tablename: 'tasks' },
      { tablename: 'users' },
    ]);
  });

  it('inserts a User and rejects a duplicate email', async () => {
    await createUser('duplicate@example.com');

    await expect(createUser('duplicate@example.com')).rejects.toBeInstanceOf(
      QueryFailedError,
    );
  });

  it('allows a Project to reference an existing User', async () => {
    const user = await createUser('owner@example.com');
    const project = await projects.save(
      projects.create({
        ownerId: user.id,
        name: 'Owned project',
        description: null,
        dueDate: null,
      }),
    );

    expect(project.ownerId).toBe(user.id);
    expect(project.status).toBe(ProjectStatus.Active);
  });

  it('rejects a Project that references a missing User', async () => {
    await expect(
      projects.save(
        projects.create({
          ownerId: randomUUID(),
          name: 'Invalid project',
          description: null,
          dueDate: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('allows a Task to reference an existing Project with enum defaults', async () => {
    const project = await createProject();
    const task = await tasks.save(
      tasks.create({
        projectId: project.id,
        title: 'First task',
        description: null,
        dueDate: null,
      }),
    );

    expect(task.status).toBe(TaskStatus.Todo);
    expect(task.priority).toBe(TaskPriority.Medium);
  });

  it('rejects a Task that references a missing Project', async () => {
    await expect(
      tasks.save(
        tasks.create({
          projectId: randomUUID(),
          title: 'Invalid task',
          description: null,
          dueDate: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('cascades Task deletion when its Project is deleted', async () => {
    const project = await createProject();
    await tasks.save(
      tasks.create({
        projectId: project.id,
        title: 'Child task',
        description: null,
        dueDate: null,
      }),
    );

    await projects.delete(project.id);

    expect(await tasks.countBy({ projectId: project.id })).toBe(0);
  });

  it('restricts User deletion while Projects exist', async () => {
    const project = await createProject();

    await expect(users.delete(project.ownerId)).rejects.toBeInstanceOf(
      QueryFailedError,
    );
  });

  it('populates nullable fields and timestamps as designed', async () => {
    const project = await createProject();

    expect(project.description).toBeNull();
    expect(project.dueDate).toBeNull();
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
  });

  it('loads relations only when explicitly requested', async () => {
    const project = await createProject();
    await tasks.save(
      tasks.create({
        projectId: project.id,
        title: 'Related task',
        description: null,
        dueDate: null,
      }),
    );

    const withoutRelations = await projects.findOneByOrFail({ id: project.id });
    const withRelations = await projects.findOneOrFail({
      where: { id: project.id },
      relations: { tasks: true, owner: true },
    });

    expect(withoutRelations.tasks).toBeUndefined();
    expect(withRelations.tasks).toHaveLength(1);
    expect(withRelations.owner.id).toBe(project.ownerId);
  });

  async function createUser(email: string): Promise<UserEntity> {
    return users.save(
      users.create({
        name: 'Database User',
        email,
        passwordHash: 'not-a-real-password-hash',
      }),
    );
  }

  async function createProject(): Promise<ProjectEntity> {
    const user = await createUser(`${randomUUID()}@example.com`);

    return projects.save(
      projects.create({
        ownerId: user.id,
        name: 'Database project',
        description: null,
        dueDate: null,
      }),
    );
  }
});
