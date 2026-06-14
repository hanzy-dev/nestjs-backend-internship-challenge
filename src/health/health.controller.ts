import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import {
  ApiRequestIdHeader,
  ApiTypedResponse,
} from '../docs/swagger.decorators';
import {
  LivenessResponseModel,
  ReadinessResponseModel,
} from '../docs/swagger.models';

@Controller('health')
@ApiTags('Health')
@ApiRequestIdHeader()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness process aplikasi' })
  @ApiTypedResponse(200, 'Aplikasi hidup.', LivenessResponseModel)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness PostgreSQL' })
  @ApiTypedResponse(200, 'PostgreSQL siap.', ReadinessResponseModel)
  @ApiResponse({ status: 503, description: 'PostgreSQL belum siap.' })
  async ready(): Promise<{ status: 'ready'; database: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Service is not ready');
    }
  }
}
