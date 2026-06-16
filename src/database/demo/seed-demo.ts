import dataSource from '../data-source';
import { DemoDataService } from './demo-data.service';

async function main(): Promise<void> {
  await dataSource.initialize();
  const service = new DemoDataService(dataSource);

  try {
    const result = await service.seed(process.env);
    console.log(
      [
        'Demo seed completed.',
        `Email: ${result.email}`,
        `Primary project ID: ${result.primaryProjectId}`,
        `Projects: ${result.projectCount}`,
        `Tasks: ${result.taskCount}`,
        'Next: npm run demo:verify',
      ].join('\n'),
    );
  } finally {
    await service.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo seed failed');
  process.exitCode = 1;
});
