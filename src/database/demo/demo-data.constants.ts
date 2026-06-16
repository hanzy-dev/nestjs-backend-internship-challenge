import { ProjectStatus } from '../../projects/domain/project-status.enum';
import { TaskPriority } from '../../tasks/domain/task-priority.enum';
import { TaskStatus } from '../../tasks/domain/task-status.enum';

export const DEMO_DEFAULT_EMAIL = 'demo.backend@example.test';
export const DEMO_USER_NAME = 'Backend Demo User';
export const DEMO_RESET_CONFIRMATION = 'RESET_LOCAL_DEMO_DATA';
export const DEMO_ALLOWED_DATABASE = 'nestjs_challenge';
export const DEMO_PRODUCTION_DATABASES = [
  'production',
  'prod',
  'nestjs_challenge_prod',
  'nestjs_challenge_production',
] as const;

export const DEMO_PROJECTS = [
  {
    name: 'Internship Backend Challenge',
    description:
      'Local demonstration project for the Backend Engineer TypeScript challenge.',
    status: ProjectStatus.Active,
    dueDate: '2026-07-15T00:00:00.000Z',
    tasks: [
      {
        title: 'Design database schema',
        description: 'Show PostgreSQL relations, migrations, and ownership.',
        status: TaskStatus.Done,
        priority: TaskPriority.High,
        dueDate: '2026-06-20T00:00:00.000Z',
      },
      {
        title: 'Implement JWT authentication',
        description: 'Demonstrate login, /auth/me, and guarded resources.',
        status: TaskStatus.InProgress,
        priority: TaskPriority.Medium,
        dueDate: '2026-06-24T00:00:00.000Z',
      },
      {
        title: 'Prepare API demonstration',
        description: 'Verify Swagger, Postman, validation, and request ID.',
        status: TaskStatus.Todo,
        priority: TaskPriority.Low,
        dueDate: '2026-06-28T00:00:00.000Z',
      },
    ],
  },
  {
    name: 'Evaluator Review Notes',
    description: 'Optional secondary project used to show project listing.',
    status: ProjectStatus.Active,
    dueDate: null,
    tasks: [],
  },
] as const;
