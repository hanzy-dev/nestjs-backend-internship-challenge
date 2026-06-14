import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Job, Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { PinoLogger } from 'nestjs-pino';
import { RedisConnectionManager } from '../src/infrastructure/redis/redis-connection.manager';
import { RedisNamespaceService } from '../src/infrastructure/redis/redis-namespace.service';
import { TaskActivityEvent } from '../src/tasks/activity/task-activity-event';
import {
  TASK_ACTIVITY_QUEUE_NAME,
  TaskActivityService,
} from '../src/tasks/activity/task-activity.service';

describe('Task activity queue (integration)', () => {
  let module: TestingModule;
  let activity: TaskActivityService;
  let namespace: RedisNamespaceService;
  let connections: RedisConnectionManager;
  let queue: Queue<TaskActivityEvent>;
  let queueEvents: QueueEvents;
  let cleanupClient: Redis;
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  beforeAll(async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      REDIS_TLS: false,
      REDIS_CONNECT_TIMEOUT_MS: 1000,
      REDIS_NAMESPACE: 'nestjs-challenge',
      CACHE_ENABLED: false,
      CACHE_TTL_SECONDS: 60,
      QUEUE_ENABLED: true,
    });
    module = await Test.createTestingModule({
      providers: [
        TaskActivityService,
        RedisConnectionManager,
        RedisNamespaceService,
        { provide: ConfigService, useValue: config },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();
    await module.init();
    activity = module.get(TaskActivityService);
    namespace = module.get(RedisNamespaceService);
    connections = module.get(RedisConnectionManager);
    const connection = {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
    queue = new Queue<TaskActivityEvent>(TASK_ACTIVITY_QUEUE_NAME, {
      connection,
      prefix: namespace.bullPrefix,
    });
    queueEvents = new QueueEvents(TASK_ACTIVITY_QUEUE_NAME, {
      connection,
      prefix: namespace.bullPrefix,
    });
    cleanupClient = new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    await cleanupClient.connect();
    await Promise.all([
      queue.waitUntilReady(),
      queueEvents.waitUntilReady(),
      cleanupClient.ping(),
    ]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await queue.drain(true);
    await queue.clean(0, 1000, 'completed');
    await queue.clean(0, 1000, 'failed');
  });

  afterAll(async () => {
    await module.close();
    await queue.obliterate({ force: true });
    await queueEvents.close();
    await queue.close();
    try {
      if (cleanupClient.status === 'ready') {
        await cleanupClient.quit();
      }
    } finally {
      if (cleanupClient.status !== 'end') {
        cleanupClient.disconnect();
      }
      cleanupClient.removeAllListeners();
    }
    expect(connections.getQueueClient()).toBeNull();
  });

  it('processes a valid event with bounded retry and retention', async () => {
    const event = createEvent('TASK_CREATED');
    await activity.publish(event);
    const job = await waitForJob(queue, event.eventId);
    await job.waitUntilFinished(queueEvents, 5000);

    expect(job.opts).toMatchObject({
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    });
    expect(logger.info).toHaveBeenCalledWith(
      { event },
      'Task activity processed',
    );
  });

  it('uses event ID as a duplicate-safe job identity', async () => {
    const event = createEvent('TASK_CREATED');
    await activity.publish(event);
    await activity.publish(event);
    const job = await waitForJob(queue, event.eventId);
    await job.waitUntilFinished(queueEvents, 5000);

    const jobs = await queue.getJobs(['wait', 'active', 'completed', 'failed']);
    expect(
      jobs.filter((candidate) => candidate.id === event.eventId),
    ).toHaveLength(1);
  });

  it('rejects invalid payload and logs the bounded failure', async () => {
    const jobId = randomUUID();
    const failureLog = observeFailureLog(logger.warn, jobId, 5000);

    try {
      const job = await queue.add(
        'TASK_CREATED',
        { invalid: true } as unknown as TaskActivityEvent,
        { attempts: 1, jobId },
      );

      await expect(job.waitUntilFinished(queueEvents, 5000)).rejects.toThrow(
        'Invalid Task activity',
      );
      await failureLog.promise;
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ jobId }),
        'Task activity job failed',
      );
    } finally {
      failureLog.dispose();
    }
  });

  it('keeps BullMQ cleanup isolated from cache keys', async () => {
    const cacheKey = `${namespace.base}:cache:sentinel:${randomUUID()}`;
    await cleanupClient.set(cacheKey, 'cache-data');
    const event = createEvent('TASK_STATUS_CHANGED');
    await activity.publish(event);
    const job = await waitForJob(queue, event.eventId);
    await job.waitUntilFinished(queueEvents, 5000);

    await queue.clean(0, 1000, 'completed');

    await expect(cleanupClient.get(cacheKey)).resolves.toBe('cache-data');
    await cleanupClient.del(cacheKey);
    expect(namespace.bullPrefix).not.toBe(`${namespace.base}:cache`);
  });
});

function createEvent(
  eventType: TaskActivityEvent['eventType'],
): TaskActivityEvent {
  return {
    eventId: randomUUID(),
    eventType,
    userId: randomUUID(),
    projectId: randomUUID(),
    taskId: randomUUID(),
    occurredAt: new Date().toISOString(),
  };
}

async function waitForJob(
  queue: Queue<TaskActivityEvent>,
  jobId: string,
): Promise<Job<TaskActivityEvent>> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const job = await queue.getJob(jobId);
    if (job) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Job ${jobId} was not found`);
}

function observeFailureLog(
  warn: jest.Mock,
  jobId: string,
  timeoutMs: number,
): { promise: Promise<void>; dispose: () => void } {
  const previousImplementation = warn.getMockImplementation();
  let timeout: NodeJS.Timeout | undefined;
  let settled = false;

  const promise = new Promise<void>((resolve, reject) => {
    timeout = setTimeout(() => {
      settled = true;
      reject(new Error(`Timed out waiting for failure log for job ${jobId}`));
    }, timeoutMs);

    warn.mockImplementation(
      (context: { jobId?: string }, message: string): void => {
        previousImplementation?.(context, message);
        if (
          !settled &&
          context.jobId === jobId &&
          message === 'Task activity job failed'
        ) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
      },
    );
  });

  return {
    promise,
    dispose: () => {
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      warn.mockImplementation(previousImplementation);
    },
  };
}
