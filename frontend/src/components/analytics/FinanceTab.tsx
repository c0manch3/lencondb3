import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { api } from '@/services/auth.service';
import toast from 'react-hot-toast';
import type {
  FinanceSummary,
  MonthlyDynamicsItem,
  ExpenseByCategoryItem,
  IncomeByProjectItem,
} from '@/types';
import MonthlyBarChart from './MonthlyBarChart';
import CategoryPieChart from './CategoryPieChart';
import BalanceLine from './BalanceLine';

const STORAGE_KEY_START = 'finance_startDate';
const STORAGE_KEY_END = 'finance_endDate';

function getDefaultStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function FinanceTab() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU';

  // Applied dates (used for API calls)
  const [startDate, setStartDate] = useState<string>(
    () => sessionStorage.getItem(STORAGE_KEY_START) || getDefaultStartDate()
  );
  const [endDate, setEndDate] = useState<string>(
    () => sessionStorage.getItem(STORAGE_KEY_END) || getDefaultEndDate()
  );

  // Temporary input dates (only applied on button click)
  const [tempStartDate, setTempStartDate] = useState<string>(startDate);
  const [tempEndDate, setTempEndDate] = useState<string>(endDate);

  // Data state
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyDynamicsItem[]>([]);
  const [categoryData, setCategoryData] = useState<ExpenseByCategoryItem[]>([]);
  const [projectData, setProjectData] = useState<IncomeByProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = useCallback(
    (amount: number): string =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'RUB',
      }).format(amount),
    [locale]
  );

  const formatMonth = useCallback(
    (monthStr: string): string => {
      // monthStr expected format: "2025-01" or similar
      const parts = monthStr.split('-');
      if (parts.length < 2) return monthStr;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1);
      const formatted = new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: '2-digit',
      }).format(d);
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    },
    [locale]
  );

  const getCategoryLabel = useCallback(
    (cat: string): string => t(`expenses.categories.${cat}`),
    [t]
  );

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [summaryRes, monthlyRes, categoryRes, projectRes] =
        await Promise.all([
          api.get<FinanceSummary>(`/analytics/finance/summary${qs}`, { signal }),
          api.get<MonthlyDynamicsItem[]>(`/analytics/finance/monthly${qs}`, { signal }),
          api.get<ExpenseByCategoryItem[]>(
            `/analytics/finance/expenses-by-category${qs}`,
            { signal }
          ),
          api.get<IncomeByProjectItem[]>(
            `/analytics/finance/income-by-project${qs}`,
            { signal }
          ),
        ]);

      setSummary(summaryRes.data);
      setMonthlyData(monthlyRes.data);
      setCategoryData(categoryRes.data);
      setProjectData(projectRes.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Failed to fetch finance data:', err);
      setError(t('finance.loadError'));
      toast.error(t('finance.loadError'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleApply = () => {
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      toast.error(t('finance.invalidDateRange'));
      return;
    }
    sessionStorage.setItem(STORAGE_KEY_START, tempStartDate);
    sessionStorage.setItem(STORAGE_KEY_END, tempEndDate);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const handleReset = () => {
    const defaultStart = getDefaultStartDate();
    const defaultEnd = getDefaultEndDate();
    setTempStartDate(defaultStart);
    setTempEndDate(defaultEnd);
    sessionStorage.setItem(STORAGE_KEY_START, defaultStart);
    sessionStorage.setItem(STORAGE_KEY_END, defaultEnd);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  };

  const hasUnappliedChanges =
    tempStartDate !== startDate || tempEndDate !== endDate;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-600"></div>
        <span className="ml-3 text-brown-400">{t('common.loading')}</span>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="card p-6">
        <div className="text-center py-12 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('finance.startDate')}
            </label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-brown-700 mb-1">
              {t('finance.endDate')}
            </label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={!hasUnappliedChanges}
              className={`px-4 py-2 text-sm font-medium rounded-[0.4rem] transition-colors ${
                hasUnappliedChanges
                  ? 'bg-brown-900 text-cream-500 hover:bg-brown-800'
                  : 'bg-cream-200 text-brown-300 cursor-not-allowed'
              }`}
            >
              {t('finance.applyFilters')}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-brown-600 bg-cream-100 hover:bg-cream-200 rounded-[0.4rem] transition-colors"
            >
              {t('finance.resetFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Income */}
          <div className="card p-4 border-l-4 border-green-500">
            <div className="text-sm text-brown-400 mb-1">
              {t('finance.income')}
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </div>
            <div className="text-xs text-brown-300 mt-1">
              {t('finance.incomeCount', { count: summary.incomeCount })}
            </div>
          </div>

          {/* Expenses */}
          <div className="card p-4 border-l-4 border-red-500">
            <div className="text-sm text-brown-400 mb-1">
              {t('finance.expenses')}
            </div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <div className="text-xs text-brown-300 mt-1">
              {t('finance.expenseCount', { count: summary.expenseCount })}
            </div>
          </div>

          {/* VAT */}
          <div className="card p-4 border-l-4 border-amber-500">
            <div className="text-sm text-brown-400 mb-1">
              {t('finance.vat')}
            </div>
            <div className="text-xl font-bold text-amber-600">
              {formatCurrency(summary.totalVat)}
            </div>
          </div>

          {/* Balance */}
          <div
            className={`card p-4 border-l-4 ${
              summary.balance >= 0 ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <div className="text-sm text-brown-400 mb-1">
              {t('finance.balance')}
            </div>
            <div
              className={`text-xl font-bold ${
                summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.balance)}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">
            {t('finance.monthlyDynamics')}
          </h3>
          {monthlyData.length > 0 ? (
            <MonthlyBarChart
              data={monthlyData}
              formatCurrency={formatCurrency}
              formatMonth={formatMonth}
              incomeLabel={t('finance.income')}
              expensesLabel={t('finance.expenses')}
            />
          ) : (
            <div className="text-center py-12 text-brown-400">
              {t('finance.noData')}
            </div>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-brown-900 mb-4">
            {t('finance.expensesByCategory')}
          </h3>
          {categoryData.length > 0 ? (
            <CategoryPieChart
              data={categoryData}
              formatCurrency={formatCurrency}
              getCategoryLabel={getCategoryLabel}
            />
          ) : (
            <div className="text-center py-12 text-brown-400">
              {t('finance.noData')}
            </div>
          )}
        </div>
      </div>

      {/* Balance Line Chart */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-brown-900 mb-4">
          {t('finance.cumulativeBalance')}
        </h3>
        {monthlyData.length > 0 ? (
          <BalanceLine
            data={monthlyData}
            formatCurrency={formatCurrency}
            formatMonth={formatMonth}
            balanceLabel={t('finance.cumulativeBalance')}
          />
        ) : (
          <div className="text-center py-12 text-brown-400">
            {t('finance.noData')}
          </div>
        )}
      </div>

      {/* Income by Project Table */}
      <div className="card">
        <div className="p-4 border-b border-brown-200">
          <h3 className="text-lg font-semibold text-brown-900">
            {t('finance.incomeByProject')}
          </h3>
        </div>
        {projectData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">
                    {t('finance.project')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-500 uppercase">
                    {t('finance.paymentsCount')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-brown-500 uppercase">
                    {t('finance.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-100">
                {projectData.map((project) => (
                  <tr key={project.projectId} className="hover:bg-cream-100">
                    <td className="px-4 py-3 font-medium text-brown-900">
                      {project.projectName}
                    </td>
                    <td className="px-4 py-3 text-brown-600">
                      {project.paymentsCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(project.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-brown-400">
            {t('finance.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
