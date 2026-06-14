import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  ProjectIdParamDto,
  TaskIdParamDto,
} from '../common/dto/uuid-param.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Body() input: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, params.projectId, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list(user.id, params.projectId, query);
  }

  @Get(':taskId')
  get(@CurrentUser() user: AuthenticatedUser, @Param() params: TaskIdParamDto) {
    return this.tasksService.get(user.id, params.projectId, params.taskId);
  }

  @Patch(':taskId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: TaskIdParamDto,
    @Body() input: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      user.id,
      params.projectId,
      params.taskId,
      input,
    );
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: TaskIdParamDto,
  ): Promise<void> {
    return this.tasksService.delete(user.id, params.projectId, params.taskId);
  }
}
