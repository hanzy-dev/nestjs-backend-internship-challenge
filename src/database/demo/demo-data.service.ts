import Redis from 'ioredis';
import { DataSource, EntityManager } from 'typeorm';
import { PasswordHasherService } from '../../auth/security/password-hasher.service';
import { ProjectEntity } from '../../projects/persistence/project.entity';
import { TaskEntity } from '../../tasks/persistence/task.entity';
import { normalizeEmail } from '../../users/email-normalizer';
import { UserEntity } from '../../users/persistence/user.entity';
import {
  DEMO_ALLOWED_DATABASE,
  DEMO_DEFAULT_EMAIL,
  DEMO_PROJECTS,
  DEMO_PRODUCTION_DATABASES,
  DEMO_RESET_CONFIRMATION,
  DEMO_USER_NAME,
} from './demo-data.constants';

export interface DemoEnvironment {
  NODE_ENV?: string;
  DATABASE_NAME?: string;
  DEMO_USER_EMAIL?: string;
  DEMO_USER_PASSWORD?: string;
  DEMO_RESET_CONFIRM?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_TLS?: string;
  REDIS_NAMESPACE?: string;
  CACHE_ENABLED?: string;
}

export interface DemoSeedResult {
  email: string;
  userId: string;
  primaryProjectId: string;
  projectCount: number;
  taskCount: number;
}

export interface DemoResetResult {
  email: string;
  userDeleted: boolean;
  projectCount: number;
  taskCount: number;
  cacheKeysDeleted: number;
}

interface DemoResetTransactionResult extends DemoResetResult {
  userId: string | null;
}

interface DemoProjectRecord {
  id: string;
}

interface CurrentDatabaseRow {
  name: string;
}

export class DemoDataService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly passwordHasher = new PasswordHasherService(),
  ) {}

  async seed(environment: DemoEnvironment): Promise<DemoSeedResult> {
    const normalizedEmail = this.getDemoEmail(environment);
    const password = environment.DEMO_USER_PASSWORD;

    if (!password) {
      throw new Error('DEMO_USER_PASSWORD is required for demo seed');
    }

    await this.assertSafeDatabase(environment);

    return this.dataSource.transaction(async (manager) => {
      const existingUser = await this.findDemoUser(manager, normalizedEmail);
      const user =
        existingUser ??
        (await manager.save(
          manager.create(UserEntity, {
            name: DEMO_USER_NAME,
            email: normalizedEmail,
            passwordHash: await this.passwordHasher.hash(password),
          }),
        ));

      if (existingUser) {
        user.name = DEMO_USER_NAME;
        user.passwordHash = await this.passwordHasher.hash(password);
        await manager.save(UserEntity, user);
      }

      await this.deleteDemoProjectsAndTasks(manager, user.id);
      const projects = await this.createDemoProjects(manager, user.id);
      const primaryProject = projects[0];
      if (!primaryProject) {
        throw new Error('Demo seed did not create a primary project');
      }
      const taskCount = DEMO_PROJECTS.reduce(
        (total, project) => total + project.tasks.length,
        0,
      );

      return {
        email: normalizedEmail,
        userId: user.id,
        primaryProjectId: primaryProject.id,
        projectCount: projects.length,
        taskCount,
      };
    });
  }

  async reset(environment: DemoEnvironment): Promise<DemoResetResult> {
    if (environment.DEMO_RESET_CONFIRM !== DEMO_RESET_CONFIRMATION) {
      throw new Error(
        `DEMO_RESET_CONFIRM must equal ${DEMO_RESET_CONFIRMATION}`,
      );
    }

    await this.assertSafeDatabase(environment);
    const normalizedEmail = this.getDemoEmail(environment);
    const projectIdsForCache: string[] = [];

    const result: DemoResetTransactionResult =
      await this.dataSource.transaction(async (manager) => {
        const user = await this.findDemoUser(manager, normalizedEmail);
        if (!user) {
          return {
            email: normalizedEmail,
            userId: null,
            userDeleted: false,
            projectCount: 0,
            taskCount: 0,
            cacheKeysDeleted: 0,
          };
        }

        const projectIds = await this.getDemoProjectIds(manager, user.id);
        projectIdsForCache.push(...projectIds);
        const taskCount = await this.deleteDemoTasks(manager, projectIds);
        const projectCount = await this.deleteDemoProjects(manager, user.id);
        await manager.delete(UserEntity, { id: user.id });

        return {
          email: normalizedEmail,
          userId: user.id,
          userDeleted: true,
          projectCount,
          taskCount,
          cacheKeysDeleted: 0,
        };
      });

    const cacheKeysDeleted = await this.deleteDemoCacheKeys(
      environment,
      result.userId,
      projectIdsForCache,
    );

    return {
      email: result.email,
      userDeleted: result.userDeleted,
      projectCount: result.projectCount,
      taskCount: result.taskCount,
      cacheKeysDeleted,
    };
  }

  async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  private getDemoEmail(environment: DemoEnvironment): string {
    return normalizeEmail(environment.DEMO_USER_EMAIL ?? DEMO_DEFAULT_EMAIL);
  }

  private async assertSafeDatabase(
    environment: DemoEnvironment,
  ): Promise<void> {
    if (environment.NODE_ENV === 'production') {
      throw new Error('Demo data commands refuse to run in production');
    }

    const configuredDatabase =
      environment.DATABASE_NAME ?? DEMO_ALLOWED_DATABASE;
    if (
      configuredDatabase !== DEMO_ALLOWED_DATABASE ||
      (DEMO_PRODUCTION_DATABASES as readonly string[]).includes(
        configuredDatabase,
      )
    ) {
      throw new Error(
        `Demo data commands require DATABASE_NAME=${DEMO_ALLOWED_DATABASE}`,
      );
    }

    const currentDatabase = await this.getCurrentDatabase();
    if (currentDatabase !== DEMO_ALLOWED_DATABASE) {
      throw new Error(
        `Refusing demo data command on unexpected database: ${currentDatabase}`,
      );
    }
  }

  private async getCurrentDatabase(): Promise<string> {
    const rows = (await this.dataSource.query(
      'SELECT current_database() AS name',
    )) as unknown;

    if (
      !Array.isArray(rows) ||
      rows.length !== 1 ||
      !this.isCurrentDatabaseRow(rows[0])
    ) {
      throw new Error('Unable to determine current database');
    }

    return rows[0].name;
  }

  private isCurrentDatabaseRow(value: unknown): value is CurrentDatabaseRow {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      typeof value.name === 'string'
    );
  }

  private async findDemoUser(
    manager: EntityManager,
    email: string,
  ): Promise<UserEntity | null> {
    return manager.findOne(UserEntity, {
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
  }

  private async deleteDemoProjectsAndTasks(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    const projectIds = await this.getDemoProjectIds(manager, userId);
    await this.deleteDemoTasks(manager, projectIds);
    await this.deleteDemoProjects(manager, userId);
  }

  private async getDemoProjectIds(
    manager: EntityManager,
    userId: string,
  ): Promise<string[]> {
    const projects = await manager.find(ProjectEntity, {
      where: { ownerId: userId },
      select: { id: true },
    });

    return projects.map((project) => project.id);
  }

  private async deleteDemoTasks(
    manager: EntityManager,
    projectIds: string[],
  ): Promise<number> {
    if (projectIds.length === 0) {
      return 0;
    }

    const result = await manager
      .createQueryBuilder()
      .delete()
      .from(TaskEntity)
      .where('project_id IN (:...projectIds)', { projectIds })
      .execute();

    return result.affected ?? 0;
  }

  private async deleteDemoProjects(
    manager: EntityManager,
    userId: string,
  ): Promise<number> {
    const result = await manager.delete(ProjectEntity, { ownerId: userId });
    return result.affected ?? 0;
  }

  private async createDemoProjects(
    manager: EntityManager,
    userId: string,
  ): Promise<DemoProjectRecord[]> {
    const projects: DemoProjectRecord[] = [];

    for (const projectDefinition of DEMO_PROJECTS) {
      const project = await manager.save(
        manager.create(ProjectEntity, {
          ownerId: userId,
          name: projectDefinition.name,
          description: projectDefinition.description,
          status: projectDefinition.status,
          dueDate: projectDefinition.dueDate
            ? new Date(projectDefinition.dueDate)
            : null,
        }),
      );

      projects.push({ id: project.id });

      for (const taskDefinition of projectDefinition.tasks) {
        await manager.save(
          manager.create(TaskEntity, {
            projectId: project.id,
            title: taskDefinition.title,
            description: taskDefinition.description,
            status: taskDefinition.status,
            priority: taskDefinition.priority,
            dueDate: taskDefinition.dueDate
              ? new Date(taskDefinition.dueDate)
              : null,
          }),
        );
      }
    }

    return projects;
  }

  private async deleteDemoCacheKeys(
    environment: DemoEnvironment,
    userId: string | null,
    projectIds: string[],
  ): Promise<number> {
    if (
      !userId ||
      projectIds.length === 0 ||
      environment.CACHE_ENABLED !== 'true'
    ) {
      return 0;
    }

    const client = new Redis({
      host: environment.REDIS_HOST ?? 'localhost',
      port: Number(environment.REDIS_PORT ?? 6379),
      password: environment.REDIS_PASSWORD || undefined,
      tls: environment.REDIS_TLS === 'true' ? {} : undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    client.on('error', () => undefined);

    try {
      await client.connect();
      const keys = projectIds.map((projectId) =>
        this.projectDetailCacheKey(environment, userId, projectId),
      );
      return await client.del(...keys);
    } catch {
      return 0;
    } finally {
      if (client.status === 'ready') {
        await client.quit();
      }
      if (client.status !== 'end') {
        client.disconnect();
      }
      client.removeAllListeners();
    }
  }

  private projectDetailCacheKey(
    environment: DemoEnvironment,
    userId: string,
    projectId: string,
  ): string {
    const namespace = environment.REDIS_NAMESPACE ?? 'nestjs-challenge';
    const nodeEnvironment = environment.NODE_ENV ?? 'development';
    return `${namespace}:${nodeEnvironment}:cache:project:${userId}:${projectId}`;
  }
}
