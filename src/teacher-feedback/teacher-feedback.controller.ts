import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeacherFeedbackService } from './teacher-feedback.service';
import { CreateTeacherFeedbackDto } from './dto/create-teacher-feedback.dto';
import { UpdateTeacherFeedbackDto } from './dto/update-teacher-feedback.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TeacherFeedbackController {
  constructor(private teacherFeedbackService: TeacherFeedbackService) {}

  // POST /submissions/:id/teacher-feedback
  @Post('submissions/:id/teacher-feedback')
  createFeedback(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: CreateTeacherFeedbackDto,
  ) {
    return this.teacherFeedbackService.createFeedback(id, user, dto);
  }

  // PATCH /teacher-feedback/:id
  @Patch('teacher-feedback/:id')
  updateFeedback(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateTeacherFeedbackDto,
  ) {
    return this.teacherFeedbackService.updateFeedback(id, user, dto);
  }

  // GET /submissions/:id/teacher-feedback
  @Get('submissions/:id/teacher-feedback')
  getFeedback(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherFeedbackService.getFeedback(id, user);
  }
}
