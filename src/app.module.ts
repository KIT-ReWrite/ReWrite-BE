import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
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
    // AssignmentsModule,
    // SubmissionsModule,
    // FeedbackModule,
    // MetricsModule,
    // DashboardModule,
  ],
})
export class AppModule {}
