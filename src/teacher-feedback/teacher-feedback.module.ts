import { Module } from '@nestjs/common';
import { TeacherFeedbackController } from './teacher-feedback.controller';
import { TeacherFeedbackService } from './teacher-feedback.service';

@Module({
  controllers: [TeacherFeedbackController],
  providers: [TeacherFeedbackService],
  exports: [TeacherFeedbackService],
})
export class TeacherFeedbackModule {}
