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
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
import {
  ApiRequestIdHeader,
  ApiStandardProtectedErrors,
  ApiTypedResponse,
} from '../docs/swagger.decorators';
import {
  PaginatedTasksResponseModel,
  TaskResponseModel,
} from '../docs/swagger.models';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
@ApiTags('Tasks')
@ApiBearerAuth('bearer')
@ApiRequestIdHeader()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat Task pada Project milik pengguna' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiBody({ type: CreateTaskDto })
  @ApiTypedResponse(201, 'Task berhasil dibuat.', TaskResponseModel)
  @ApiStandardProtectedErrors()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Body() input: CreateTaskDto,
  ) {
    return this.tasksService.create(user.id, params.projectId, input);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar Task pada Project milik pengguna' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiTypedResponse(
    200,
    'Daftar Task terpaginasikan.',
    PaginatedTasksResponseModel,
  )
  @ApiStandardProtectedErrors()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.list(user.id, params.projectId, query);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Mengambil detail Task pada Project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiTypedResponse(200, 'Detail Task.', TaskResponseModel)
  @ApiStandardProtectedErrors()
  get(@CurrentUser() user: AuthenticatedUser, @Param() params: TaskIdParamDto) {
    return this.tasksService.get(user.id, params.projectId, params.taskId);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Memperbarui Task pada Project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiTypedResponse(200, 'Task berhasil diperbarui.', TaskResponseModel)
  @ApiStandardProtectedErrors()
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
  @ApiOperation({ summary: 'Menghapus Task pada Project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Task berhasil dihapus tanpa response body.',
  })
  @ApiStandardProtectedErrors()
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: TaskIdParamDto,
  ): Promise<void> {
    return this.tasksService.delete(user.id, params.projectId, params.taskId);
  }
}
