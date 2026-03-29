import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { Plugin, ScriptableLineSegmentContext } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlyDynamicsItem } from '@/shared/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
);

// ─── Warm palette ───────────────────────────────────────────────────────────

const POSITIVE_COLOR = 'rgba(75, 108, 56, 0.85)';
const NEGATIVE_COLOR = 'rgba(156, 60, 40, 0.85)';
const FILL_POSITIVE = 'rgba(75, 108, 56, 0.10)';
const FILL_NEGATIVE = 'rgba(156, 60, 40, 0.10)';
const GRID_COLOR = 'rgba(34, 21, 13, 0.10)';
const TEXT_COLOR = '#22150d';
const MUTED_TEXT = '#7d6b5d';
const ZERO_LINE_COLOR = 'rgba(34, 21, 13, 0.35)';

// ─── Zero-line plugin ───────────────────────────────────────────────────────

const zeroLinePlugin: Plugin<'line'> = {
  id: 'zeroLine',
  beforeDraw(chart) {
    const yScale = chart.scales['y'];
    if (!yScale) return;

    const yPos = yScale.getPixelForValue(0);
    if (yPos < chart.chartArea.top || yPos > chart.chartArea.bottom) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = ZERO_LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.moveTo(chart.chartArea.left, yPos);
    ctx.lineTo(chart.chartArea.right, yPos);
    ctx.stroke();
    ctx.restore();
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

interface BalanceLineProps {
  data: MonthlyDynamicsItem[];
}

export default function BalanceLine({ data }: BalanceLineProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const balances = data.map((d) => d.cumulativeBalance);

    return {
      labels: data.map((d) => d.month),
      datasets: [
        {
          label: t('analytics.cumulativeBalance'),
          data: balances,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          // Dynamic color per segment
          segment: {
            borderColor: (ctx: ScriptableLineSegmentContext) => {
              const val = ctx.p1.parsed.y ?? 0;
              return val >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
            },
            backgroundColor: (ctx: ScriptableLineSegmentContext) => {
              const val = ctx.p1.parsed.y ?? 0;
              return val >= 0 ? FILL_POSITIVE : FILL_NEGATIVE;
            },
          },
          borderColor: POSITIVE_COLOR,
          backgroundColor: FILL_POSITIVE,
          pointBackgroundColor: balances.map((v) =>
            v >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR,
          ),
          pointBorderColor: '#fdfaf0',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [data, t]);

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
            label: (ctx: { parsed: { y: number | null } }) => {
              const value = ctx.parsed.y ?? 0;
              return `${t('analytics.balanceTooltip')}: ${value.toLocaleString('ru-RU')} \u20BD`;
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
              if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
              if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
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
        {t('analytics.cumulativeBalance')}
      </h3>
      <div className="h-[300px]">
        <Line data={chartData} options={options} plugins={[zeroLinePlugin]} />
      </div>
    </div>
  );
}
