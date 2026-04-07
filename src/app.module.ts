import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TeacherFeedbackModule } from './teacher-feedback/teacher-feedback.module';
import { StudentMetricsModule } from './student-metrics/student-metrics.module';
// 앞으로 classes, assignments 등도 추가 예정

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,
    UsersModule,
    ClassesModule,
    AssignmentsModule,
    SubmissionsModule,
    TeacherFeedbackModule,
    StudentMetricsModule,
    // DashboardModule,
  ],
})
export class AppModule {}
