import dataSource from '../data-source';
import { DemoDataService } from './demo-data.service';

async function main(): Promise<void> {
  await dataSource.initialize();
  const service = new DemoDataService(dataSource);

  try {
    const result = await service.reset(process.env);
    console.log(
      [
        'Demo reset completed.',
        `Email: ${result.email}`,
        `User deleted: ${result.userDeleted}`,
        `Projects deleted: ${result.projectCount}`,
        `Tasks deleted: ${result.taskCount}`,
        `Cache keys deleted: ${result.cacheKeysDeleted}`,
      ].join('\n'),
    );
  } finally {
    await service.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo reset failed');
  process.exitCode = 1;
});
