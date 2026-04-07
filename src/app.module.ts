import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/users.module';
// 앞으로 classes, assignments 등도 추가 예정

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,
    UserModule,
    // ClassesModule,
    // AssignmentsModule,
    // SubmissionsModule,
    // FeedbackModule,
    // MetricsModule,
    // DashboardModule,
  ],
})
export class AppModule {}
