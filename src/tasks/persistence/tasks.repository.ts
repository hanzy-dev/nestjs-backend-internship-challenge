import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListTasksQueryDto, TaskSortField } from '../dto/list-tasks-query.dto';
import { TaskEntity } from './task.entity';

const TASK_SORT_COLUMNS: Record<TaskSortField, string> = {
  title: 'task.title',
  status: 'task.status',
  priority: 'task.priority',
  createdAt: 'task.createdAt',
  updatedAt: 'task.updatedAt',
  dueDate: 'task.dueDate',
};

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repository: Repository<TaskEntity>,
  ) {}

  create(input: Partial<TaskEntity>): TaskEntity {
    return this.repository.create(input);
  }

  save(task: TaskEntity): Promise<TaskEntity> {
    return this.repository.save(task);
  }

  findByIdAndProject(
    taskId: string,
    projectId: string,
  ): Promise<TaskEntity | null> {
    return this.repository.findOneBy({ id: taskId, projectId });
  }

  findPaginatedByProject(
    projectId: string,
    query: ListTasksQueryDto,
  ): Promise<[TaskEntity[], number]> {
    const builder = this.repository
      .createQueryBuilder('task')
      .where('task.projectId = :projectId', { projectId });

    if (query.status) {
      builder.andWhere('task.status = :status', { status: query.status });
    }
    if (query.priority) {
      builder.andWhere('task.priority = :priority', {
        priority: query.priority,
      });
    }

    return builder
      .orderBy(
        TASK_SORT_COLUMNS[query.sortBy],
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
        'NULLS LAST',
      )
      .addOrderBy('task.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  remove(task: TaskEntity): Promise<TaskEntity> {
    return this.repository.remove(task);
  }
}
