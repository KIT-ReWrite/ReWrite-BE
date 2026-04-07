import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentMetricsService } from './student-metrics.service';
import { UpdateMetricsDto } from './dto/update-metrics.dto';
import { CreateScoreDto } from './dto/create-score.dto';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentMetricsController {
  constructor(private studentMetricsService: StudentMetricsService) {}

  // GET /students/:id/metrics
  @Get(':id/metrics')
  getMetrics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.studentMetricsService.getMetrics(BigInt(id), user);
  }

  // PUT /students/:id/metrics
  @Put(':id/metrics')
  updateMetrics(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateMetricsDto,
  ) {
    return this.studentMetricsService.updateMetrics(BigInt(id), user, dto);
  }

  // GET /students/:id/scores
  @Get(':id/scores')
  getScores(@Param('id') id: string, @CurrentUser() user: any) {
    return this.studentMetricsService.getScores(BigInt(id), user);
  }

  // POST /students/:id/scores
  @Post(':id/scores')
  createScore(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateScoreDto,
  ) {
    return this.studentMetricsService.createScore(BigInt(id), user, dto);
  }
}
