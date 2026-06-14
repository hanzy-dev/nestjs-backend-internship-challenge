import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ListProjectsQueryDto,
  ProjectSortField,
} from '../dto/list-projects-query.dto';
import { ProjectEntity } from './project.entity';

const PROJECT_SORT_COLUMNS: Record<ProjectSortField, string> = {
  name: 'project.name',
  createdAt: 'project.createdAt',
  updatedAt: 'project.updatedAt',
  dueDate: 'project.dueDate',
};

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  create(input: Partial<ProjectEntity>): ProjectEntity {
    return this.repository.create(input);
  }

  save(project: ProjectEntity): Promise<ProjectEntity> {
    return this.repository.save(project);
  }

  findByIdAndOwner(
    projectId: string,
    ownerId: string,
  ): Promise<ProjectEntity | null> {
    return this.repository.findOneBy({ id: projectId, ownerId });
  }

  findDetailByIdAndOwner(
    projectId: string,
    ownerId: string,
  ): Promise<ProjectEntity | null> {
    return this.repository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.tasks', 'task')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.ownerId = :ownerId', { ownerId })
      .orderBy('task.createdAt', 'ASC')
      .addOrderBy('task.id', 'ASC')
      .getOne();
  }

  findPaginatedByOwner(
    ownerId: string,
    query: ListProjectsQueryDto,
  ): Promise<[ProjectEntity[], number]> {
    const builder = this.repository
      .createQueryBuilder('project')
      .where('project.ownerId = :ownerId', { ownerId });

    if (query.status) {
      builder.andWhere('project.status = :status', { status: query.status });
    }

    return builder
      .orderBy(
        PROJECT_SORT_COLUMNS[query.sortBy],
        query.sortOrder.toUpperCase() as 'ASC' | 'DESC',
        'NULLS LAST',
      )
      .addOrderBy('project.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  remove(project: ProjectEntity): Promise<ProjectEntity> {
    return this.repository.remove(project);
  }
}
