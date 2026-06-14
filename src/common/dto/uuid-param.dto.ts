import { IsUUID } from 'class-validator';

export class ProjectIdParamDto {
  @IsUUID()
  projectId!: string;
}

export class TaskIdParamDto extends ProjectIdParamDto {
  @IsUUID()
  taskId!: string;
}
