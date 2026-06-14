import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createPaginationMeta } from '../common/dto/pagination-meta.dto';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from './cache/project-detail-cache-invalidator';
import type { ProjectDetailCacheInvalidator } from './cache/project-detail-cache-invalidator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import {
  PaginatedProjectsResponse,
  ProjectDetailResponse,
  ProjectResponse,
} from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  mapProjectDetailResponse,
  mapProjectResponse,
} from './mappers/project-response.mapper';
import { ProjectEntity } from './persistence/project.entity';
import { ProjectsRepository } from './persistence/projects.repository';

const PROJECT_NOT_FOUND_MESSAGE = 'Project not found';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    @Inject(PROJECT_DETAIL_CACHE_INVALIDATOR)
    private readonly cacheInvalidator: ProjectDetailCacheInvalidator,
  ) {}

  async create(
    ownerId: string,
    input: CreateProjectDto,
  ): Promise<ProjectResponse> {
    const project = this.projectsRepository.create({
      ownerId,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    });

    return mapProjectResponse(await this.projectsRepository.save(project));
  }

  async list(
    ownerId: string,
    query: ListProjectsQueryDto,
  ): Promise<PaginatedProjectsResponse> {
    const [projects, totalItems] =
      await this.projectsRepository.findPaginatedByOwner(ownerId, query);

    return {
      data: projects.map(mapProjectResponse),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async getDetail(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectDetailResponse> {
    const project = await this.projectsRepository.findDetailByIdAndOwner(
      projectId,
      ownerId,
    );

    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }

    return mapProjectDetailResponse(project);
  }

  async requireOwnedProject(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findByIdAndOwner(
      projectId,
      ownerId,
    );

    if (!project) {
      throw new NotFoundException(PROJECT_NOT_FOUND_MESSAGE);
    }

    return project;
  }

  async update(
    ownerId: string,
    projectId: string,
    input: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.requireOwnedProject(ownerId, projectId);

    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined)
      project.description = input.description;
    if (input.status !== undefined) project.status = input.status;
    if (input.dueDate !== undefined) {
      project.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    const saved = await this.projectsRepository.save(project);
    await this.cacheInvalidator.invalidate(ownerId, projectId);

    return mapProjectResponse(saved);
  }

  async delete(ownerId: string, projectId: string): Promise<void> {
    const project = await this.requireOwnedProject(ownerId, projectId);
    await this.projectsRepository.remove(project);
    await this.cacheInvalidator.invalidate(ownerId, projectId);
  }
}
