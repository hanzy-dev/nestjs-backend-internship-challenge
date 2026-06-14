import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { RedisConnectionManager } from '../../infrastructure/redis/redis-connection.manager';
import { RedisNamespaceService } from '../../infrastructure/redis/redis-namespace.service';
import { TaskPriority } from '../../tasks/domain/task-priority.enum';
import { TaskStatus } from '../../tasks/domain/task-status.enum';
import { ProjectStatus } from '../domain/project-status.enum';
import { ProjectDetailResponse } from '../dto/project-response.dto';
import type { ProjectDetailCacheInvalidator } from './project-detail-cache-invalidator';

@Injectable()
export class ProjectDetailCacheService implements ProjectDetailCacheInvalidator {
  private readonly ttlSeconds: number;

  constructor(
    configService: ConfigService,
    private readonly connections: RedisConnectionManager,
    private readonly namespace: RedisNamespaceService,
    private readonly logger: PinoLogger,
  ) {
    this.ttlSeconds = configService.getOrThrow<number>('CACHE_TTL_SECONDS');
    this.logger.setContext(ProjectDetailCacheService.name);
  }

  async get(
    userId: string,
    projectId: string,
  ): Promise<ProjectDetailResponse | null> {
    const client = this.connections.getCacheClient();
    if (!client) {
      return null;
    }

    try {
      const value = await client.get(
        this.namespace.projectDetail(userId, projectId),
      );
      return value ? deserializeProjectDetail(value) : null;
    } catch (error) {
      this.logger.warn(
        { err: error, projectId },
        'Project Detail cache read failed',
      );
      return null;
    }
  }

  async set(
    userId: string,
    projectId: string,
    value: ProjectDetailResponse,
  ): Promise<void> {
    const client = this.connections.getCacheClient();
    if (!client) {
      return;
    }

    try {
      await client.set(
        this.namespace.projectDetail(userId, projectId),
        JSON.stringify(value),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      this.logger.warn(
        { err: error, projectId },
        'Project Detail cache write failed',
      );
    }
  }

  async invalidate(userId: string, projectId: string): Promise<void> {
    const client = this.connections.getCacheClient();
    if (!client) {
      return;
    }

    try {
      await client.del(this.namespace.projectDetail(userId, projectId));
    } catch (error) {
      this.logger.warn(
        { err: error, projectId },
        'Project Detail cache invalidation failed',
      );
    }
  }
}

function deserializeProjectDetail(value: string): ProjectDetailResponse {
  const parsed: unknown = JSON.parse(value);
  if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) {
    throw new Error('Malformed Project Detail cache value');
  }

  return {
    id: readString(parsed, 'id'),
    name: readString(parsed, 'name'),
    description: readNullableString(parsed, 'description'),
    status: readEnum(parsed, 'status', ProjectStatus),
    dueDate: readNullableDate(parsed, 'dueDate'),
    createdAt: readDate(parsed, 'createdAt'),
    updatedAt: readDate(parsed, 'updatedAt'),
    tasks: parsed.tasks.map((task) => {
      if (!isRecord(task)) {
        throw new Error('Malformed cached Task');
      }
      return {
        id: readString(task, 'id'),
        projectId: readString(task, 'projectId'),
        title: readString(task, 'title'),
        description: readNullableString(task, 'description'),
        status: readEnum(task, 'status', TaskStatus),
        priority: readEnum(task, 'priority', TaskPriority),
        dueDate: readNullableDate(task, 'dueDate'),
        createdAt: readDate(task, 'createdAt'),
        updatedAt: readDate(task, 'updatedAt'),
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Malformed cache field: ${key}`);
  }
  return value;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (value !== null && typeof value !== 'string') {
    throw new Error(`Malformed cache field: ${key}`);
  }
  return value;
}

function readDate(record: Record<string, unknown>, key: string): Date {
  const value = new Date(readString(record, key));
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Malformed cache date: ${key}`);
  }
  return value;
}

function readNullableDate(
  record: Record<string, unknown>,
  key: string,
): Date | null {
  return record[key] === null ? null : readDate(record, key);
}

function readEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  values: Record<string, T>,
): T {
  const value = readString(record, key);
  if (!Object.values(values).includes(value as T)) {
    throw new Error(`Malformed cache enum: ${key}`);
  }
  return value as T;
}
