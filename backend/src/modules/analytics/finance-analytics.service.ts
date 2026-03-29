import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  totalVat: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface MonthlyDynamicsItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  cumulativeBalance: number;
}

export interface ExpenseByCategoryItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface IncomeByProjectItem {
  projectId: string;
  projectName: string;
  total: number;
  paymentsCount: number;
}

@Injectable()
export class FinanceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(
    startDate?: string,
    endDate?: string,
  ): { gte?: Date; lte?: Date } | undefined {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    if (!startDate && !endDate) {
      // Fallback for unbounded queries: default to last 12 months to prevent OOM
      const fallbackStart = new Date();
      fallbackStart.setMonth(fallbackStart.getMonth() - 12);
      return { gte: fallbackStart };
    }

    const range: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      range.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      range.lte = end;
    }

    return range;
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private generateMonthRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= last) {
      months.push(this.getMonthKey(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  async getFinanceSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<FinanceSummary> {
    const dateRange = this.buildDateRange(startDate, endDate);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.paymentSchedule.aggregate({
        where: {
          isPaid: true,
          actualDate: dateRange ?? { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          deletedAt: null,
          ...(dateRange ? { date: dateRange } : {}),
        },
        _sum: { amount: true, vatAmount: true },
        _count: { id: true },
      }),
    ]);

    const totalIncome = this.round2(incomeAgg._sum.amount ?? 0);
    const totalExpenses = this.round2(expenseAgg._sum.amount ?? 0);
    const totalVat = this.round2(expenseAgg._sum.vatAmount ?? 0);

    return {
      totalIncome,
      totalExpenses,
      totalVat,
      balance: this.round2(totalIncome - totalExpenses),
      incomeCount: incomeAgg._count.id,
      expenseCount: expenseAgg._count.id,
    };
  }

  async getMonthlyDynamics(
    startDate?: string,
    endDate?: string,
  ): Promise<MonthlyDynamicsItem[]> {
    const dateRange = this.buildDateRange(startDate, endDate);

    const [payments, expenses] = await Promise.all([
      this.prisma.paymentSchedule.findMany({
        where: {
          isPaid: true,
          ...(dateRange ? { actualDate: dateRange } : {}),
        },
        select: { actualDate: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          deletedAt: null,
          ...(dateRange ? { date: dateRange } : {}),
        },
        select: { date: true, amount: true },
      }),
    ]);

    // Group income by month and collect dates in a single pass
    const incomeByMonth = new Map<string, number>();
    const allDates: Date[] = [];

    for (const payment of payments) {
      if (!payment.actualDate) continue;
      const key = this.getMonthKey(payment.actualDate);
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + payment.amount);
      allDates.push(payment.actualDate);
    }

    // Group expenses by month and collect dates in a single pass
    const expenseByMonth = new Map<string, number>();
    for (const expense of expenses) {
      const key = this.getMonthKey(expense.date);
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + expense.amount);
      allDates.push(expense.date);
    }

    if (allDates.length === 0) {
      return [];
    }

    allDates.sort((a, b) => a.getTime() - b.getTime());

    const rangeStart = startDate ? new Date(startDate) : allDates[0];
    const rangeEnd = endDate ? new Date(endDate) : allDates[allDates.length - 1];

    const months = this.generateMonthRange(rangeStart, rangeEnd);

    // Accumulate raw values, round only when forming output
    let cumulativeRaw = 0;

    return months.map((month) => {
      const incomeRaw = incomeByMonth.get(month) ?? 0;
      const expenseRaw = expenseByMonth.get(month) ?? 0;
      cumulativeRaw += incomeRaw - expenseRaw;

      return {
        month,
        income: this.round2(incomeRaw),
        expenses: this.round2(expenseRaw),
        balance: this.round2(incomeRaw - expenseRaw),
        cumulativeBalance: this.round2(cumulativeRaw),
      };
    });
  }

  async getExpensesByCategory(
    startDate?: string,
    endDate?: string,
  ): Promise<ExpenseByCategoryItem[]> {
    const dateRange = this.buildDateRange(startDate, endDate);

    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        deletedAt: null,
        ...(dateRange ? { date: dateRange } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalSum = grouped.reduce(
      (sum, item) => sum + (item._sum.amount ?? 0),
      0,
    );

    const result = grouped
      .map((item) => {
        const total = this.round2(item._sum.amount ?? 0);
        return {
          category: item.category,
          total,
          count: item._count.id,
          percentage: totalSum > 0 ? this.round2((total / totalSum) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return result;
  }

  async getIncomeByProject(
    startDate?: string,
    endDate?: string,
  ): Promise<IncomeByProjectItem[]> {
    const dateRange = this.buildDateRange(startDate, endDate);

    const payments = await this.prisma.paymentSchedule.findMany({
      where: {
        isPaid: true,
        ...(dateRange ? { actualDate: dateRange } : {}),
      },
      select: {
        projectId: true,
        amount: true,
        project: { select: { id: true, name: true } },
      },
    });

    // Group by projectId
    const projectMap = new Map<
      string,
      { projectId: string; projectName: string; total: number; paymentsCount: number }
    >();

    for (const payment of payments) {
      const existing = projectMap.get(payment.projectId);
      if (existing) {
        existing.total += payment.amount;
        existing.paymentsCount += 1;
      } else {
        projectMap.set(payment.projectId, {
          projectId: payment.projectId,
          projectName: payment.project.name,
          total: payment.amount,
          paymentsCount: 1,
        });
      }
    }

    return Array.from(projectMap.values())
      .map((item) => ({
        ...item,
        total: this.round2(item.total),
      }))
      .sort((a, b) => b.total - a.total);
  }
}
