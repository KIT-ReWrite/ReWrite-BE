import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AIFeedbackService } from './ai-feedback.service';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class AIFeedbackController {
  constructor(private aiFeedbackService: AIFeedbackService) {}

  // GET /submissions/:id/ai-feedback
  @Get(':id/ai-feedback')
  getAIFeedback(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.aiFeedbackService.getAIFeedback(id, user);
  }

  // POST /submissions/:id/ai-feedback
  @Post(':id/ai-feedback')
  createAIFeedback(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.aiFeedbackService.createAIFeedback(id, user);
  }
}
