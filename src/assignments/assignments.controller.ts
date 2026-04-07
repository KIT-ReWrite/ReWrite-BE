import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  // GET /assignments?classId=&status=
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

  // POST /assignments
  @Post('assignments')
  createAssignment(@CurrentUser() user: any, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.createAssignment(user, dto);
  }

  // GET /assignments/:id
  @Get('assignments/:id')
  getAssignmentById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getAssignmentById(id, user);
  }

  // GET /classes/:classId/assignments
  @Get('classes/:classId/assignments')
  getAssignmentsByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: any,
  ) {
    return this.assignmentsService.getAssignmentsByClass(classId, user);
  }
}
