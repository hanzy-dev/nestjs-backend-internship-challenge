import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ApiErrorResponseModel,
  AuthResponseModel,
  LivenessResponseModel,
  PaginatedProjectsResponseModel,
  PaginatedTasksResponseModel,
  PaginationMetaModel,
  ProjectDetailResponseModel,
  ProjectResponseModel,
  ReadinessResponseModel,
  TaskResponseModel,
  UserResponseModel,
} from './swagger.models';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NestJS Backend Internship Challenge API')
    .setDescription(
      'REST API untuk authentication, Project, Task, health, Redis cache, dan BullMQ activity.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token dari POST /api/v1/auth/login',
      },
      'bearer',
    )
    .addTag('Authentication')
    .addTag('Projects')
    .addTag('Tasks')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ApiErrorResponseModel,
      AuthResponseModel,
      LivenessResponseModel,
      PaginatedProjectsResponseModel,
      PaginatedTasksResponseModel,
      PaginationMetaModel,
      ProjectDetailResponseModel,
      ProjectResponseModel,
      ReadinessResponseModel,
      TaskResponseModel,
      UserResponseModel,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
