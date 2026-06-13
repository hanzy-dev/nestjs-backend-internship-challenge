import { Injectable } from '@nestjs/common';

export interface ApplicationMetadata {
  name: string;
  status: string;
  version: string;
}

@Injectable()
export class AppService {
  getMetadata(): ApplicationMetadata {
    return {
      name: 'NestJS Backend Internship Challenge',
      status: 'Batch 1 - Bootstrap and configuration',
      version: 'v1',
    };
  }
}
