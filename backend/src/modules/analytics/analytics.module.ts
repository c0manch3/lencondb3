import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, FinanceAnalyticsService],
})
export class AnalyticsModule {}
