import { buildDataSourceOptions, DatabaseSettings } from './database.config';
import { databaseEntities } from './database.entities';

describe('buildDataSourceOptions', () => {
  const settings: DatabaseSettings = {
    nodeEnv: 'development',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'private-value',
    developmentName: 'development_database',
    testName: 'test_database',
    poolMax: 7,
    ssl: false,
  };

  it('builds deterministic development options', () => {
    const options = buildDataSourceOptions(settings);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'private-value',
      database: 'development_database',
      synchronize: false,
      migrationsRun: false,
      logging: false,
      ssl: false,
      extra: { max: 7 },
    });
    expect(options.entities).toEqual([...databaseEntities]);
  });

  it('selects the isolated test database in test mode', () => {
    expect(
      buildDataSourceOptions({ ...settings, nodeEnv: 'test' }).database,
    ).toBe('test_database');
  });

  it('rejects equal test and development database names', () => {
    expect(() =>
      buildDataSourceOptions({
        ...settings,
        nodeEnv: 'test',
        testName: 'development_database',
      }),
    ).toThrow('Test database must differ from development database');
  });

  it('enables explicit certificate verification for SSL', () => {
    const options = buildDataSourceOptions({ ...settings, ssl: true });

    if (options.type !== 'postgres') {
      throw new Error('Expected PostgreSQL DataSource options');
    }

    expect(options.ssl).toEqual({
      rejectUnauthorized: true,
    });
  });
});
