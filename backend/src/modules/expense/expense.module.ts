import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { ExpenseIOService } from './expense-io.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ExpenseController],
  providers: [ExpenseService, ExpenseIOService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
