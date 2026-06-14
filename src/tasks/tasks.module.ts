import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { TaskEntity } from './persistence/task.entity';
import { TasksRepository } from './persistence/tasks.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity]), ProjectsModule],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
})
export class TasksModule {}
