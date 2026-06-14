import { Module } from '@nestjs/common';
import { TaskActivityService } from './task-activity.service';
import { TASK_ACTIVITY_PUBLISHER } from './task-activity-publisher';

@Module({
  providers: [
    TaskActivityService,
    {
      provide: TASK_ACTIVITY_PUBLISHER,
      useExisting: TaskActivityService,
    },
  ],
  exports: [TASK_ACTIVITY_PUBLISHER],
})
export class TaskActivityModule {}
