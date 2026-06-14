import { validateTaskActivityEvent } from './task-activity.service';

describe('validateTaskActivityEvent', () => {
  it('accepts the minimal typed payload', () => {
    expect(
      validateTaskActivityEvent({
        eventId: 'event-id',
        eventType: 'TASK_CREATED',
        userId: 'user-id',
        projectId: 'project-id',
        taskId: 'task-id',
        occurredAt: '2026-06-14T00:00:00.000Z',
      }),
    ).toMatchObject({
      eventId: 'event-id',
      eventType: 'TASK_CREATED',
      taskId: 'task-id',
    });
  });

  it.each([
    {},
    { eventType: 'UNKNOWN' },
    {
      eventId: 'event-id',
      eventType: 'TASK_CREATED',
      userId: 'user-id',
      projectId: 'project-id',
      taskId: 'task-id',
      occurredAt: 'not-a-date',
    },
  ])('rejects invalid payload %#', (payload) => {
    expect(() => validateTaskActivityEvent(payload)).toThrow(
      /Invalid Task activity/,
    );
  });
});
