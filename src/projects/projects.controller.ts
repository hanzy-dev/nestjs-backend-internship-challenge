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
import { ProjectIdParamDto } from '../common/dto/uuid-param.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, input);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(user.id, query);
  }

  @Get(':projectId')
  getDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
  ) {
    return this.projectsService.getDetail(user.id, params.projectId);
  }

  @Patch(':projectId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, params.projectId, input);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
  ): Promise<void> {
    return this.projectsService.delete(user.id, params.projectId);
  }
}
