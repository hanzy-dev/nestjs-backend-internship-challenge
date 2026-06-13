import { DataSource } from 'typeorm';

const cleanupTables = ['tasks', 'projects', 'users'] as const;

export async function cleanTestDatabase(dataSource: DataSource): Promise<void> {
  const databaseName = await getCurrentDatabase(dataSource);
  const expectedTestName = process.env.DATABASE_TEST_NAME;
  const developmentName = process.env.DATABASE_NAME;

  if (
    !expectedTestName ||
    databaseName !== expectedTestName ||
    databaseName === developmentName
  ) {
    throw new Error(`Refusing to clean unexpected database: ${databaseName}`);
  }

  await dataSource.transaction(async (manager) => {
    for (const table of cleanupTables) {
      await manager.query(`DELETE FROM "${table}"`);
    }
  });
}

export async function getCurrentDatabase(
  dataSource: DataSource,
): Promise<string> {
  const rows: unknown = await dataSource.query(
    'SELECT current_database() AS name',
  );

  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    !isRecord(rows[0]) ||
    typeof rows[0].name !== 'string'
  ) {
    throw new Error('Unable to determine the current database');
  }

  return rows[0].name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
