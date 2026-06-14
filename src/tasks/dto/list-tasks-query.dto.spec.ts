import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListTasksQueryDto } from './list-tasks-query.dto';

describe('ListTasksQueryDto', () => {
  it('accepts whitelisted filtering and sorting values', async () => {
    const query = plainToInstance(ListTasksQueryDto, {
      page: '2',
      limit: '10',
      status: 'todo',
      priority: 'high',
      sortBy: 'priority',
      sortOrder: 'asc',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, limit: 10 });
  });

  it('rejects excessive limits and unsafe sort fields', async () => {
    const query = plainToInstance(ListTasksQueryDto, {
      limit: '101',
      sortBy: 'projectId',
    });

    expect(await validate(query)).toHaveLength(2);
  });
});
