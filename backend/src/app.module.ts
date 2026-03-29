import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { CompanyModule } from './modules/company/company.module';
import { ProjectModule } from './modules/project/project.module';
import { WorkloadPlanModule } from './modules/workload-plan/workload-plan.module';
import { WorkloadActualModule } from './modules/workload-actual/workload-actual.module';
import { PaymentScheduleModule } from './modules/payment-schedule/payment-schedule.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LenconnectChatLogModule } from './modules/lenconnect-chat-log/lenconnect-chat-log.module';
import { InviteModule } from './modules/invite/invite.module';
import { MailModule } from './modules/mail/mail.module';
import { ExpenseModule } from './modules/expense/expense.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    CompanyModule,
    ProjectModule,
    WorkloadPlanModule,
    WorkloadActualModule,
    PaymentScheduleModule,
    AnalyticsModule,
    LenconnectChatLogModule,
    InviteModule,
    MailModule,
    ExpenseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
