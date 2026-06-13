import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getMetadata', () => {
    it('returns deterministic bootstrap metadata', () => {
      expect(appController.getMetadata()).toEqual({
        name: 'NestJS Backend Internship Challenge',
        status: 'Batch 1 - Bootstrap and configuration',
        version: 'v1',
      });
    });
  });
});
