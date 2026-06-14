import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createPaginationMeta } from '../common/dto/pagination-meta.dto';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from '../projects/cache/project-detail-cache-invalidator';
import type { ProjectDetailCacheInvalidator } from '../projects/cache/project-detail-cache-invalidator';
import { ProjectsService } from '../projects/projects.service';
import type { TaskActivityEvent } from './activity/task-activity-event';
import { TASK_ACTIVITY_PUBLISHER } from './activity/task-activity-publisher';
import type { TaskActivityPublisher } from './activity/task-activity-publisher';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { PaginatedTasksResponse, TaskResponse } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { mapTaskResponse } from './mappers/task-response.mapper';
import { TaskEntity } from './persistence/task.entity';
import { TasksRepository } from './persistence/tasks.repository';

const TASK_NOT_FOUND_MESSAGE = 'Task not found';

@Injectable()
export class TasksService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly tasksRepository: TasksRepository,
    @Inject(PROJECT_DETAIL_CACHE_INVALIDATOR)
    private readonly cacheInvalidator: ProjectDetailCacheInvalidator,
    @Optional()
    @Inject(TASK_ACTIVITY_PUBLISHER)
    private readonly activityPublisher?: TaskActivityPublisher,
  ) {}

  async create(
    ownerId: string,
    projectId: string,
    input: CreateTaskDto,
  ): Promise<TaskResponse> {
    await this.projectsService.requireOwnedProject(ownerId, projectId);
    const task = this.tasksRepository.create({
      projectId,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    });
    const saved = await this.tasksRepository.save(task);
    await this.cacheInvalidator.invalidate(ownerId, projectId);
    await this.publishActivity({
      eventType: 'TASK_CREATED',
      ownerId,
      projectId,
      taskId: saved.id,
    });
    return mapTaskResponse(saved);
  }

  async list(
    ownerId: string,
    projectId: string,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasksResponse> {
    await this.projectsService.requireOwnedProject(ownerId, projectId);
    const [tasks, totalItems] =
      await this.tasksRepository.findPaginatedByProject(projectId, query);

    return {
      data: tasks.map(mapTaskResponse),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async get(
    ownerId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskResponse> {
    await this.projectsService.requireOwnedProject(ownerId, projectId);
    return mapTaskResponse(await this.requireTask(projectId, taskId));
  }

  async update(
    ownerId: string,
    projectId: string,
    taskId: string,
    input: UpdateTaskDto,
  ): Promise<TaskResponse> {
    await this.projectsService.requireOwnedProject(ownerId, projectId);
    const task = await this.requireTask(projectId, taskId);
    const previousStatus = task.status;

    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;
    if (input.status !== undefined) task.status = input.status;
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.dueDate !== undefined) {
      task.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    const saved = await this.tasksRepository.save(task);
    await this.cacheInvalidator.invalidate(ownerId, projectId);
    if (input.status !== undefined && input.status !== previousStatus) {
      await this.publishActivity({
        eventType: 'TASK_STATUS_CHANGED',
        ownerId,
        projectId,
        taskId: saved.id,
      });
    }
    return mapTaskResponse(saved);
  }

  async delete(
    ownerId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.projectsService.requireOwnedProject(ownerId, projectId);
    const task = await this.requireTask(projectId, taskId);
    await this.tasksRepository.remove(task);
    await this.cacheInvalidator.invalidate(ownerId, projectId);
  }

  private async requireTask(
    projectId: string,
    taskId: string,
  ): Promise<TaskEntity> {
    const task = await this.tasksRepository.findByIdAndProject(
      taskId,
      projectId,
    );
    if (!task) {
      throw new NotFoundException(TASK_NOT_FOUND_MESSAGE);
    }
    return task;
  }

  private async publishActivity(input: {
    eventType: TaskActivityEvent['eventType'];
    ownerId: string;
    projectId: string;
    taskId: string;
  }): Promise<void> {
    await this.activityPublisher?.publish({
      eventId: randomUUID(),
      eventType: input.eventType,
      userId: input.ownerId,
      projectId: input.projectId,
      taskId: input.taskId,
      occurredAt: new Date().toISOString(),
    });
  }
}
