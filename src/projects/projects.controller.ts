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
import { ProjectIdParamDto } from '../common/dto/uuid-param.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import {
  ApiRequestIdHeader,
  ApiStandardProtectedErrors,
  ApiTypedResponse,
} from '../docs/swagger.decorators';
import {
  PaginatedProjectsResponseModel,
  ProjectDetailResponseModel,
  ProjectResponseModel,
} from '../docs/swagger.models';

@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiTags('Projects')
@ApiBearerAuth('bearer')
@ApiRequestIdHeader()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat Project milik pengguna saat ini' })
  @ApiBody({ type: CreateProjectDto })
  @ApiTypedResponse(201, 'Project berhasil dibuat.', ProjectResponseModel)
  @ApiStandardProtectedErrors()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar Project milik pengguna saat ini' })
  @ApiTypedResponse(
    200,
    'Daftar Project terpaginasikan.',
    PaginatedProjectsResponseModel,
  )
  @ApiStandardProtectedErrors()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsQueryDto,
  ) {
    return this.projectsService.list(user.id, query);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Project Detail beserta Tasks' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiTypedResponse(
    200,
    'Project Detail beserta Tasks.',
    ProjectDetailResponseModel,
  )
  @ApiStandardProtectedErrors()
  getDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
  ) {
    return this.projectsService.getDetail(user.id, params.projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Memperbarui Project milik pengguna saat ini' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiTypedResponse(200, 'Project berhasil diperbarui.', ProjectResponseModel)
  @ApiStandardProtectedErrors()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, params.projectId, input);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Menghapus Project dan Tasks terkait' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Project berhasil dihapus tanpa response body.',
  })
  @ApiStandardProtectedErrors()
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: ProjectIdParamDto,
  ): Promise<void> {
    return this.projectsService.delete(user.id, params.projectId);
  }
}
