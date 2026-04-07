import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Get()
  getClasses(@CurrentUser() user: any) {
    return this.classesService.getClasses(user);
  }

  @Post()
  createClass(@CurrentUser() user: any, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(user, dto);
  }

  @Get(':id')
  getClassById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.classesService.getClassById(id, user);
  }

  @Post('join')
  joinClass(@CurrentUser() user: any, @Body() dto: JoinClassDto) {
    return this.classesService.joinClass(user, dto);
  }

  @Get(':id/students')
  getStudents(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.getStudents(id);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.classesService.getStats(id);
  }

  @Delete(':classId/students/:studentId')
  removeStudent(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    return this.classesService.removeStudent(classId, BigInt(studentId), user);
  }
}
