import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ProjectsRepository } from './projects.repository';

describe('ProjectsRepository', () => {
  it('loads Project Detail and all Tasks with one joined query builder execution', async () => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const typeormRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    } as unknown as Repository<ProjectEntity>;
    const module = await Test.createTestingModule({
      providers: [
        ProjectsRepository,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: typeormRepository,
        },
      ],
    }).compile();
    const repository = module.get(ProjectsRepository);

    await repository.findDetailByIdAndOwner('project-id', 'owner-id');

    expect(builder.leftJoinAndSelect).toHaveBeenCalledWith(
      'project.tasks',
      'task',
    );
    expect(builder.getOne).toHaveBeenCalledTimes(1);
  });
});
