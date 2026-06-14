export const TASK_ACTIVITY_EVENT_TYPES = [
  'TASK_CREATED',
  'TASK_STATUS_CHANGED',
] as const;

export type TaskActivityEventType = (typeof TASK_ACTIVITY_EVENT_TYPES)[number];

export interface TaskActivityEvent {
  eventId: string;
  eventType: TaskActivityEventType;
  userId: string;
  projectId: string;
  taskId: string;
  occurredAt: string;
}
