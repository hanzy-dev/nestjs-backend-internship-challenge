import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProjectsQueryDto } from './list-projects-query.dto';

describe('ListProjectsQueryDto', () => {
  it('applies pagination and deterministic sorting defaults', async () => {
    const query = plainToInstance(ListProjectsQueryDto, {});

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('converts integer query strings and rejects unsafe sorting', async () => {
    const valid = plainToInstance(ListProjectsQueryDto, {
      page: '2',
      limit: '50',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const invalid = plainToInstance(ListProjectsQueryDto, {
      sortBy: 'ownerId',
      sortOrder: 'DROP TABLE projects',
    });

    await expect(validate(valid)).resolves.toHaveLength(0);
    expect(valid.page).toBe(2);
    expect(valid.limit).toBe(50);
    expect(await validate(invalid)).toHaveLength(2);
  });
});
