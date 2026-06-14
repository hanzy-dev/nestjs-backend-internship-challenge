import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NoopProjectDetailCacheInvalidator,
  PROJECT_DETAIL_CACHE_INVALIDATOR,
} from './cache/project-detail-cache-invalidator';
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
    {
      provide: PROJECT_DETAIL_CACHE_INVALIDATOR,
      useClass: NoopProjectDetailCacheInvalidator,
    },
  ],
  exports: [ProjectsService, PROJECT_DETAIL_CACHE_INVALIDATOR],
})
export class ProjectsModule {}
