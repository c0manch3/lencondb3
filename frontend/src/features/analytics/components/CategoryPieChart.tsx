import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ExpenseByCategoryItem, ExpenseCategory } from '@/shared/types';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Warm category color palette from TABLE_DESIGN ──────────────────────────

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Salary: '#8B6914',
  IncomeTax: '#B5453A',
  InsuranceContrib: '#C4862B',
  SocialInsurance: '#7B5C8E',
  SimplifiedTax: '#3D7A7A',
  VAT: '#D47625',
  Penalty: '#A33030',
  IndividualTax: '#5B5FA0',
  Rent: '#8E5EB0',
  Services: '#B05580',
  Other: '#7D6B5D',
};

const TEXT_COLOR = '#22150d';

// ─── Component ──────────────────────────────────────────────────────────────

interface CategoryPieChartProps {
  data: ExpenseByCategoryItem[];
}

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => t(`expenses.categories.${d.category}`)),
      datasets: [
        {
          data: data.map((d) => d.total),
          backgroundColor: data.map((d) => CATEGORY_COLORS[d.category] ?? '#7D6B5D'),
          hoverBackgroundColor: data.map((d) => {
            const base = CATEGORY_COLORS[d.category] ?? '#7D6B5D';
            return base + 'DD';
          }),
          borderWidth: 2,
          borderColor: '#fdfaf0',
          hoverBorderColor: '#fdfaf0',
        },
      ],
    }),
    [data, t],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: TEXT_COLOR,
            font: { size: 11, weight: 500 as const },
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 12,
            boxWidth: 12,
            boxHeight: 12,
          },
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
            label: (ctx: {
              label: string;
              parsed: number;
              dataset: { data: number[] };
            }) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
              return `${ctx.label}: ${ctx.parsed.toLocaleString('ru-RU')} \u20BD (${pct}%)`;
            },
          },
        },
      },
    }),
    [],
  );

  return (
    <div className="bg-cream-50 border border-brown-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-brown-900 mb-3">
        {t('analytics.expensesByCategory')}
      </h3>
      <div className="h-[300px]">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
