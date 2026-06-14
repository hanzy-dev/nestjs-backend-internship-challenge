import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns lightweight liveness without dependencies', () => {
    const controller = new HealthController({} as DataSource);
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports PostgreSQL readiness without connection details', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as DataSource;
    const controller = new HealthController(dataSource);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ready',
      database: 'up',
    });
  });

  it('maps PostgreSQL failure to service unavailable', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('private connection error')),
    } as unknown as DataSource;
    const controller = new HealthController(dataSource);

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
