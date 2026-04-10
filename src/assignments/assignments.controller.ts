import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Get('assignments')
  getAssignments(
    @CurrentUser() user: any,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
  ) {
    return this.assignmentsService.getAssignments(
      user,
      classId ? parseInt(classId) : undefined,
      status,
    );
  }

  @Post('assignments')
  createAssignment(@CurrentUser() user: any, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.createAssignment(user, dto);
  }

  @Get('assignments/:id')
  getAssignmentById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getAssignmentById(id, user);
  }

  // ✅ 추가
  @Patch('assignments/:id')
  updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.updateAssignment(id, user, dto);
  }

  // ✅ 추가
  @Delete('assignments/:id')
  deleteAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.deleteAssignment(id, user);
  }

  @Get('classes/:classId/assignments')
  getAssignmentsByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getAssignmentsByClass(classId, user);
  }
}
