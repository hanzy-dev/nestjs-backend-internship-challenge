import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  projectId!: string;
}

export class TaskIdParamDto extends ProjectIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  taskId!: string;
}
