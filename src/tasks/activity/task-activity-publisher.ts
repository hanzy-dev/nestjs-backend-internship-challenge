import { TaskActivityEvent } from './task-activity-event';

export const TASK_ACTIVITY_PUBLISHER = Symbol('TASK_ACTIVITY_PUBLISHER');

export interface TaskActivityPublisher {
  publish(event: TaskActivityEvent): Promise<void>;
}
