import { Module } from '@nestjs/common';
import { AIFeedbackController } from './ai-feedback.controller';
import { AIFeedbackService } from './ai-feedback.service';
import { GroqService } from './groq.service';

@Module({
  controllers: [AIFeedbackController],
  providers: [AIFeedbackService, GroqService],
  exports: [AIFeedbackService],
})
export class AIFeedbackModule {}
