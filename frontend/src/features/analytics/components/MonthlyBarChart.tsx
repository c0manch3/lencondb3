import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthlyDynamicsItem } from '@/shared/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Warm palette constants ─────────────────────────────────────────────────

const INCOME_COLOR = 'rgba(75, 108, 56, 0.75)';
const INCOME_HOVER = 'rgba(75, 108, 56, 0.90)';
const EXPENSE_COLOR = 'rgba(156, 60, 40, 0.75)';
const EXPENSE_HOVER = 'rgba(156, 60, 40, 0.90)';
const GRID_COLOR = 'rgba(34, 21, 13, 0.10)';
const TEXT_COLOR = '#22150d';
const MUTED_TEXT = '#7d6b5d';

// ─── Component ──────────────────────────────────────────────────────────────

interface MonthlyBarChartProps {
  data: MonthlyDynamicsItem[];
}

export default function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.month),
      datasets: [
        {
          label: t('finance.income'),
          data: data.map((d) => d.income),
          backgroundColor: INCOME_COLOR,
          hoverBackgroundColor: INCOME_HOVER,
          borderRadius: 3,
          borderSkipped: false as const,
        },
        {
          label: t('finance.expenses'),
          data: data.map((d) => d.expenses),
          backgroundColor: EXPENSE_COLOR,
          hoverBackgroundColor: EXPENSE_HOVER,
          borderRadius: 3,
          borderSkipped: false as const,
        },
      ],
    }),
    [data, t],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: TEXT_COLOR,
            font: { size: 12, weight: 500 as const },
            usePointStyle: true,
            pointStyleWidth: 12,
            padding: 16,
          },
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#fdfaf0',
          titleColor: TEXT_COLOR,
          bodyColor: TEXT_COLOR,
          borderColor: 'rgba(34, 21, 13, 0.15)',
          borderWidth: 1,
          cornerRadius: 6,
          padding: 10,
          bodyFont: { size: 12 },
          titleFont: { size: 13, weight: 600 as const },
          callbacks: {
            label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
              const value = ctx.parsed.y ?? 0;
              return `${ctx.dataset.label}: ${value.toLocaleString('ru-RU')} \u20BD`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: MUTED_TEXT,
            font: { size: 11 },
          },
          border: {
            color: GRID_COLOR,
          },
        },
        y: {
          grid: {
            color: GRID_COLOR,
          },
          ticks: {
            color: MUTED_TEXT,
            font: { size: 11 },
            callback: (value: string | number) => {
              const num = typeof value === 'string' ? parseFloat(value) : value;
              if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
              if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
              return String(num);
            },
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [],
  );

  return (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-brown-900 mb-3">
        {t('analytics.monthlyDynamics')}
      </h3>
      <div className="h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
