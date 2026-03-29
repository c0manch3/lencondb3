import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Button, DatePicker, Spinner, Table } from '@/shared/components';
import type { IncomeByProjectItem, ExpenseByCategoryItem, ExpenseCategory } from '@/shared/types';
import {
  useFinanceSummary,
  useMonthlyDynamics,
  useExpensesByCategory,
  useIncomeByProject,
  type DateRangeParams,
} from '../hooks/useAnalytics';
import MonthlyBarChart from './MonthlyBarChart';
import CategoryPieChart from './CategoryPieChart';
import BalanceLine from './BalanceLine';

// ─── Storage key ────────────────────────────────────────────────────────────

const FINANCE_DATES_KEY = 'analytics-finance-dates';

// ─── Default: 3 months back to today ────────────────────────────────────────

function defaultFinanceDates(): DateRangeParams {
  try {
    const stored = sessionStorage.getItem(FINANCE_DATES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DateRangeParams;
      if (parsed.startDate && parsed.endDate) return parsed;
    }
  } catch {
    // ignore parse errors
  }

  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ─── Category label helper ──────────────────────────────────────────────────

function getCategoryLabel(cat: ExpenseCategory, t: (key: string) => string): string {
  return t(`expenses.categories.${cat}`);
}

// ─── Summary card ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'danger';
}) {
  const colorClass =
    variant === 'success'
      ? 'text-[#3d5a2a]'
      : variant === 'danger'
        ? 'text-[#8b3a2a]'
        : 'text-brown-900';

  return (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <p className="text-xs font-medium text-brown-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

// ─── RUB formatter ──────────────────────────────────────────────────────────

function fmtRub(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} \u20BD`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FinanceTab() {
  const { t } = useTranslation();
  const [dates, setDates] = useState<DateRangeParams>(defaultFinanceDates);
  const [startInput, setStartInput] = useState(dates.startDate);
  const [endInput, setEndInput] = useState(dates.endDate);

  const handleApply = useCallback(() => {
    const next: DateRangeParams = { startDate: startInput, endDate: endInput };
    setDates(next);
    try {
      sessionStorage.setItem(FINANCE_DATES_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage may be unavailable
    }
  }, [startInput, endInput]);

  // ─── Data hooks ────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(dates);
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyDynamics(dates);
  const { data: byCategory, isLoading: categoryLoading } = useExpensesByCategory(dates);
  const { data: byProject, isLoading: projectLoading } = useIncomeByProject(dates);

  const isLoading = summaryLoading || monthlyLoading || categoryLoading || projectLoading;

  // ─── Income by project table ───────────────────────────────────────
  const incomeColumns = useMemo<ColumnDef<IncomeByProjectItem, unknown>[]>(
    () => [
      {
        accessorKey: 'projectName',
        header: t('finance.project'),
        cell: ({ getValue }) => (
          <span className="font-semibold text-brown-900">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'paymentsCount',
        header: t('finance.paymentsCount'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'total',
        header: t('finance.amount'),
        size: 150,
        cell: ({ getValue }) => (
          <span className="font-medium text-brown-900">
            {fmtRub(getValue<number>())}
          </span>
        ),
      },
    ],
    [t],
  );

  // ─── Expenses by category table ────────────────────────────────────
  const categoryColumns = useMemo<ColumnDef<ExpenseByCategoryItem, unknown>[]>(
    () => [
      {
        accessorKey: 'category',
        header: t('expenses.category'),
        cell: ({ getValue }) => {
          const cat = getValue<ExpenseCategory>();
          return (
            <span className="font-semibold text-brown-900">
              {getCategoryLabel(cat, t)}
            </span>
          );
        },
      },
      {
        accessorKey: 'count',
        header: t('analytics.reportsCount'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'total',
        header: t('finance.amount'),
        size: 150,
        cell: ({ getValue }) => (
          <span className="font-medium text-brown-900">
            {fmtRub(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'percentage',
        header: '%',
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-brown-600">{getValue<number>().toFixed(1)}%</span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Date range controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <DatePicker
          label={t('finance.startDate')}
          value={startInput}
          onChange={(e) => setStartInput(e.target.value)}
        />
        <DatePicker
          label={t('finance.endDate')}
          value={endInput}
          onChange={(e) => setEndInput(e.target.value)}
        />
        <Button onClick={handleApply} size="md">
          {t('common.apply')}
        </Button>
        {isLoading && <Spinner size="sm" />}
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label={t('finance.income')}
          value={fmtRub(summary?.totalIncome ?? 0)}
          variant="success"
        />
        <SummaryCard
          label={t('finance.expenses')}
          value={fmtRub(summary?.totalExpenses ?? 0)}
          variant="danger"
        />
        <SummaryCard label={t('finance.vat')} value={fmtRub(summary?.totalVat ?? 0)} />
        <SummaryCard
          label={t('finance.balance')}
          value={fmtRub(summary?.balance ?? 0)}
          variant={(summary?.balance ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-2">
          {monthly && monthly.length > 0 ? (
            <MonthlyBarChart data={monthly} />
          ) : !monthlyLoading ? (
            <div className="bg-cream-50 border border-brown-200 rounded-xl p-8 text-center text-brown-500">
              {t('analytics.noDataForPeriod')}
            </div>
          ) : null}
        </div>

        <div>
          {byCategory && byCategory.length > 0 ? (
            <CategoryPieChart data={byCategory} />
          ) : !categoryLoading ? (
            <div className="bg-cream-50 border border-brown-200 rounded-xl p-8 text-center text-brown-500">
              {t('analytics.noExpensesData')}
            </div>
          ) : null}
        </div>

        <div>
          {monthly && monthly.length > 0 ? (
            <BalanceLine data={monthly} />
          ) : !monthlyLoading ? (
            <div className="bg-cream-50 border border-brown-200 rounded-xl p-8 text-center text-brown-500">
              {t('analytics.noBalanceData')}
            </div>
          ) : null}
        </div>
      </div>

      {/* Income by project table */}
      <div>
        <h3 className="text-sm font-semibold text-brown-900 mb-3">
          {t('analytics.incomeByProject')}
        </h3>
        <Table<IncomeByProjectItem>
          data={byProject ?? []}
          columns={incomeColumns}
          isLoading={projectLoading}
          sorting
          emptyState={{
            title: t('analytics.noIncomeData'),
          }}
        />
      </div>

      {/* Expenses by category table */}
      <div>
        <h3 className="text-sm font-semibold text-brown-900 mb-3">
          {t('analytics.expensesByCategory')}
        </h3>
        <Table<ExpenseByCategoryItem>
          data={byCategory ?? []}
          columns={categoryColumns}
          isLoading={categoryLoading}
          sorting
          emptyState={{
            title: t('analytics.noExpensesData'),
          }}
        />
      </div>
    </div>
  );
}
