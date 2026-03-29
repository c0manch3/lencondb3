import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { MonthlyDynamicsItem } from '@/types';

interface MonthlyBarChartProps {
  data: MonthlyDynamicsItem[];
  formatCurrency: (value: number) => string;
  formatMonth: (month: string) => string;
  incomeLabel: string;
  expensesLabel: string;
}

export default function MonthlyBarChart({
  data,
  formatCurrency,
  formatMonth,
  incomeLabel,
  expensesLabel,
}: MonthlyBarChartProps) {
  if (data.length === 0) {
    return null;
  }

  const legendFormatter = (value: string) => {
    if (value === 'income') return incomeLabel;
    if (value === 'expenses') return expensesLabel;
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 21, 13, 0.12)" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fontSize: 12, fill: '#5c4a3e' }}
        />
        <YAxis
          tickFormatter={(v: number) => formatCurrency(v)}
          tick={{ fontSize: 11, fill: '#5c4a3e' }}
          width={100}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === 'income' ? incomeLabel : expensesLabel,
          ]}
          labelFormatter={(label) => formatMonth(String(label))}
          contentStyle={{
            borderRadius: '0.4rem',
            border: '1px solid rgba(34, 21, 13, 0.15)',
            backgroundColor: '#fdfaf0',
            boxShadow: '0 4px 6px -1px rgba(34, 21, 13, 0.08)',
          }}
        />
        <Legend formatter={legendFormatter} />
        <Bar
          dataKey="income"
          fill="#10b981"
          radius={[3, 3, 0, 0]}
          maxBarSize={50}
        />
        <Bar
          dataKey="expenses"
          fill="#ef4444"
          radius={[3, 3, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
