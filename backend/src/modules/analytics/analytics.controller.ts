import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, AdminGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { DateRangeDto } from './dto/date-range.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly financeAnalyticsService: FinanceAnalyticsService,
  ) {}

  @Get('projects-workload')
  @Roles('Manager', 'Admin', 'Trial')
  async getProjectsWorkload() {
    return this.analyticsService.getProjectsWorkload();
  }

  @Get('employee-work-hours')
  @Roles('Manager', 'Admin', 'Trial')
  async getEmployeeWorkHours(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getEmployeeWorkHours(startDate, endDate);
  }

  @Get('finance/summary')
  @UseGuards(AdminGuard)
  async getFinanceSummary(@Query() dto: DateRangeDto) {
    return this.financeAnalyticsService.getFinanceSummary(
      dto.startDate,
      dto.endDate,
    );
  }

  @Get('finance/monthly')
  @UseGuards(AdminGuard)
  async getMonthlyDynamics(@Query() dto: DateRangeDto) {
    return this.financeAnalyticsService.getMonthlyDynamics(
      dto.startDate,
      dto.endDate,
    );
  }

  @Get('finance/expenses-by-category')
  @UseGuards(AdminGuard)
  async getExpensesByCategory(@Query() dto: DateRangeDto) {
    return this.financeAnalyticsService.getExpensesByCategory(
      dto.startDate,
      dto.endDate,
    );
  }

  @Get('finance/income-by-project')
  @UseGuards(AdminGuard)
  async getIncomeByProject(@Query() dto: DateRangeDto) {
    return this.financeAnalyticsService.getIncomeByProject(
      dto.startDate,
      dto.endDate,
    );
  }
}
