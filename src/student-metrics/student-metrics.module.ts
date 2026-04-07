import { Module } from '@nestjs/common';
import { StudentMetricsController } from './student-metrics.controller';
import { StudentMetricsService } from './student-metrics.service';

@Module({
  controllers: [StudentMetricsController],
  providers: [StudentMetricsService],
  exports: [StudentMetricsService],
})
export class StudentMetricsModule {}
