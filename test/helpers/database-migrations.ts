import { DataSource } from 'typeorm';

export async function runTestMigrations(dataSource: DataSource): Promise<void> {
  if (!dataSource.isInitialized) {
    throw new Error(
      'Test DataSource must be initialized before migrations run',
    );
  }

  await dataSource.runMigrations({ transaction: 'all' });
}
