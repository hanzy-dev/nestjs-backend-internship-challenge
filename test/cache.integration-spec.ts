import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { ProjectDetailCacheService } from '../src/projects/cache/project-detail-cache.service';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from '../src/projects/cache/project-detail-cache-invalidator';
import { ProjectStatus } from '../src/projects/domain/project-status.enum';
import { ProjectEntity } from '../src/projects/persistence/project.entity';
import { ProjectsRepository } from '../src/projects/persistence/projects.repository';
import { ProjectsService } from '../src/projects/projects.service';
import { RedisConnectionManager } from '../src/infrastructure/redis/redis-connection.manager';
import { RedisNamespaceService } from '../src/infrastructure/redis/redis-namespace.service';

describe('Project Detail cache (integration)', () => {
  const repository = {
    findDetailByIdAndOwner: jest.fn(),
  };
  let module: TestingModule;
  let service: ProjectsService;
  let cache: ProjectDetailCacheService;
  let connections: RedisConnectionManager;
  let namespace: RedisNamespaceService;
  const cleanupKeys = new Set<string>();

  beforeAll(async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      REDIS_TLS: false,
      REDIS_CONNECT_TIMEOUT_MS: 1000,
      REDIS_NAMESPACE: 'nestjs-challenge',
      CACHE_ENABLED: true,
      CACHE_TTL_SECONDS: 60,
      QUEUE_ENABLED: true,
    });
    const logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
    };
    module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        ProjectDetailCacheService,
        RedisConnectionManager,
        RedisNamespaceService,
        { provide: ConfigService, useValue: config },
        { provide: PinoLogger, useValue: logger },
        { provide: ProjectsRepository, useValue: repository },
        {
          provide: PROJECT_DETAIL_CACHE_INVALIDATOR,
          useExisting: ProjectDetailCacheService,
        },
      ],
    }).compile();
    await module.init();
    service = module.get(ProjectsService);
    cache = module.get(ProjectDetailCacheService);
    connections = module.get(RedisConnectionManager);
    namespace = module.get(RedisNamespaceService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    const client = connections.getCacheClient();
    if (client && cleanupKeys.size > 0) {
      await client.del(...cleanupKeys);
    }
    cleanupKeys.clear();
  });

  afterAll(async () => {
    await module.close();
    expect(connections.getCacheClient()).toBeNull();
    expect(connections.getQueueClient()).toBeNull();
  });

  it('misses, loads PostgreSQL once, stores with TTL, then hits cache', async () => {
    const ownerId = randomUUID();
    const projectId = randomUUID();
    const key = namespace.projectDetail(ownerId, projectId);
    cleanupKeys.add(key);
    repository.findDetailByIdAndOwner.mockResolvedValue(
      createProject(ownerId, projectId),
    );

    const first = await service.getDetail(ownerId, projectId);
    const second = await service.getDetail(ownerId, projectId);
    const client = connections.getCacheClient();

    expect(first).toEqual(second);
    expect(repository.findDetailByIdAndOwner).toHaveBeenCalledTimes(1);
    await expect(client?.ttl(key)).resolves.toBeGreaterThan(0);
  });

  it('isolates cache keys by user ID', async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const projectId = randomUUID();
    cleanupKeys.add(namespace.projectDetail(userA, projectId));
    cleanupKeys.add(namespace.projectDetail(userB, projectId));
    await cache.set(userA, projectId, {
      id: projectId,
      name: 'Private Project',
      description: null,
      status: ProjectStatus.Active,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
    });

    await expect(cache.get(userB, projectId)).resolves.toBeNull();
  });

  it('falls back after malformed cache data', async () => {
    const ownerId = randomUUID();
    const projectId = randomUUID();
    const key = namespace.projectDetail(ownerId, projectId);
    cleanupKeys.add(key);
    await connections.getCacheClient()?.set(key, '{malformed');
    repository.findDetailByIdAndOwner.mockResolvedValue(
      createProject(ownerId, projectId),
    );

    await service.getDetail(ownerId, projectId);

    expect(repository.findDetailByIdAndOwner).toHaveBeenCalledTimes(1);
  });

  it('invalidates only the exact cache key and leaves BullMQ keys intact', async () => {
    const ownerId = randomUUID();
    const projectId = randomUUID();
    const cacheKey = namespace.projectDetail(ownerId, projectId);
    const bullKey = `${namespace.bullPrefix}:sentinel:${randomUUID()}`;
    cleanupKeys.add(cacheKey);
    cleanupKeys.add(bullKey);
    const client = connections.getCacheClient();
    await client?.set(cacheKey, 'cached');
    await client?.set(bullKey, 'queue-data');

    await cache.invalidate(ownerId, projectId);

    await expect(client?.get(cacheKey)).resolves.toBeNull();
    await expect(client?.get(bullKey)).resolves.toBe('queue-data');
  });
});

function createProject(ownerId: string, projectId: string): ProjectEntity {
  return {
    id: projectId,
    ownerId,
    name: 'Cached Project',
    description: null,
    status: ProjectStatus.Active,
    dueDate: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    owner: {
      id: ownerId,
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
