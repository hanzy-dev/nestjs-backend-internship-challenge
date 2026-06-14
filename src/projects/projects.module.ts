import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PROJECT_DETAIL_CACHE_INVALIDATOR } from './cache/project-detail-cache-invalidator';
import { ProjectDetailCacheService } from './cache/project-detail-cache.service';
import { ProjectEntity } from './persistence/project.entity';
import { ProjectsRepository } from './persistence/projects.repository';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity])],
  controllers: [ProjectsController],
  providers: [
    ProjectsRepository,
    ProjectsService,
    ProjectDetailCacheService,
    {
      provide: PROJECT_DETAIL_CACHE_INVALIDATOR,
      useExisting: ProjectDetailCacheService,
    },
  ],
  exports: [ProjectsService, PROJECT_DETAIL_CACHE_INVALIDATOR],
})
export class ProjectsModule {}
