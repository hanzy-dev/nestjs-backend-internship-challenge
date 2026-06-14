import {
  Injectable,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionOptions, Job, Queue, QueueEvents, Worker } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import { RedisConnectionManager } from '../../infrastructure/redis/redis-connection.manager';
import { RedisNamespaceService } from '../../infrastructure/redis/redis-namespace.service';
import {
  TASK_ACTIVITY_EVENT_TYPES,
  TaskActivityEvent,
  TaskActivityEventType,
} from './task-activity-event';
import type { TaskActivityPublisher } from './task-activity-publisher';

export const TASK_ACTIVITY_QUEUE_NAME = 'task-activity';

@Injectable()
export class TaskActivityService
  implements
    TaskActivityPublisher,
    OnModuleInit,
    OnModuleDestroy,
    OnApplicationShutdown
{
  private queue: Queue<
    TaskActivityEvent,
    void,
    TaskActivityEventType,
    TaskActivityEvent,
    void,
    TaskActivityEventType
  > | null = null;
  private worker: Worker<
    TaskActivityEvent,
    void,
    TaskActivityEventType
  > | null = null;
  private queueEvents: QueueEvents | null = null;
  private initializationPromise: Promise<void> | null = null;
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly connections: RedisConnectionManager,
    private readonly namespace: RedisNamespaceService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TaskActivityService.name);
  }

  async onModuleInit(): Promise<void> {
    this.initializationPromise ??= this.initialize();
    await this.initializationPromise;
  }

  async publish(event: TaskActivityEvent): Promise<void> {
    if (!this.queue) {
      return;
    }

    try {
      await this.queue.add(event.eventType, event, {
        jobId: event.eventId,
      });
    } catch (error) {
      this.logger.warn(
        { err: error, eventId: event.eventId },
        'Task activity enqueue failed',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.shutdown();
  }

  private async initialize(): Promise<void> {
    if (!this.configService.getOrThrow<boolean>('QUEUE_ENABLED')) {
      return;
    }
    if (!(await this.connections.ensureQueueClient())) {
      return;
    }

    const common = {
      prefix: this.namespace.bullPrefix,
    };
    const connection = this.createConnectionOptions();
    const queue = new Queue<
      TaskActivityEvent,
      void,
      TaskActivityEventType,
      TaskActivityEvent,
      void,
      TaskActivityEventType
    >(TASK_ACTIVITY_QUEUE_NAME, {
      ...common,
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
    const queueEvents = new QueueEvents(TASK_ACTIVITY_QUEUE_NAME, {
      ...common,
      connection: this.createConnectionOptions(),
    });
    const worker = new Worker<TaskActivityEvent, void, TaskActivityEventType>(
      TASK_ACTIVITY_QUEUE_NAME,
      async (job) => this.process(job),
      {
        ...common,
        connection: this.createConnectionOptions(),
        concurrency: 1,
      },
    );
    worker.on('failed', this.handleFailedJob);
    this.queue = queue;
    this.queueEvents = queueEvents;
    this.worker = worker;
    try {
      await Promise.all([
        queue.waitUntilReady(),
        queueEvents.waitUntilReady(),
        worker.waitUntilReady(),
      ]);
    } catch (error) {
      await this.shutdown();
      throw error;
    }
  }

  private async shutdown(): Promise<void> {
    this.shutdownPromise ??= (async () => {
      const worker = this.worker;
      const queueEvents = this.queueEvents;
      const queue = this.queue;
      this.worker = null;
      this.queueEvents = null;
      this.queue = null;
      this.initializationPromise = null;

      worker?.removeListener('failed', this.handleFailedJob);
      await Promise.allSettled([
        worker?.close(),
        queueEvents?.close(),
        queue?.close(),
      ]);
      worker?.removeAllListeners();
      queueEvents?.removeAllListeners();
      queue?.removeAllListeners();
    })();
    await this.shutdownPromise;
  }

  private async process(job: Job<TaskActivityEvent>): Promise<void> {
    const event = validateTaskActivityEvent(job.data);
    this.logger.info({ event }, 'Task activity processed');
    await Promise.resolve();
  }

  private createConnectionOptions(): ConnectionOptions {
    return {
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.getOrThrow<number>('REDIS_PORT'),
      password:
        this.configService.getOrThrow<string>('REDIS_PASSWORD') || undefined,
      tls: this.configService.getOrThrow<boolean>('REDIS_TLS') ? {} : undefined,
      connectTimeout: this.configService.getOrThrow<number>(
        'REDIS_CONNECT_TIMEOUT_MS',
      ),
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    };
  }

  private readonly handleFailedJob = (
    job: Job<TaskActivityEvent> | undefined,
    error: Error,
  ): void => {
    this.logger.warn(
      { err: error, jobId: job?.id },
      'Task activity job failed',
    );
  };
}

export function validateTaskActivityEvent(value: unknown): TaskActivityEvent {
  if (!isRecord(value)) {
    throw new Error('Invalid Task activity payload');
  }

  const eventType = value.eventType;
  if (
    typeof eventType !== 'string' ||
    !TASK_ACTIVITY_EVENT_TYPES.includes(
      eventType as TaskActivityEvent['eventType'],
    )
  ) {
    throw new Error('Invalid Task activity event type');
  }

  const event = {
    eventId: readString(value, 'eventId'),
    eventType: eventType as TaskActivityEvent['eventType'],
    userId: readString(value, 'userId'),
    projectId: readString(value, 'projectId'),
    taskId: readString(value, 'taskId'),
    occurredAt: readString(value, 'occurredAt'),
  };
  if (Number.isNaN(Date.parse(event.occurredAt))) {
    throw new Error('Invalid Task activity occurrence time');
  }
  return event;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid Task activity field: ${key}`);
  }
  return value;
}
