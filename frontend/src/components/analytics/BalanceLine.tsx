import { useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { MonthlyDynamicsItem } from '@/types';

interface BalanceLineProps {
  data: MonthlyDynamicsItem[];
  formatCurrency: (value: number) => string;
  formatMonth: (month: string) => string;
  balanceLabel: string;
}

export default function BalanceLine({
  data,
  formatCurrency,
  formatMonth,
  balanceLabel,
}: BalanceLineProps) {
  const id = useId();
  const gradientId = `balanceGradient-${id}`;
  const strokeId = `balanceStroke-${id}`;

  if (data.length === 0) {
    return null;
  }

  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((d) => d.cumulativeBalance));
    const dataMin = Math.min(...data.map((d) => d.cumulativeBalance));
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor="#10b981" stopOpacity={0.6} />
            <stop offset={off} stopColor="#10b981" stopOpacity={0.05} />
            <stop offset={off} stopColor="#ef4444" stopOpacity={0.05} />
            <stop offset={1} stopColor="#ef4444" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset={0} stopColor="#10b981" stopOpacity={1} />
            <stop offset={off} stopColor="#10b981" stopOpacity={1} />
            <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
            <stop offset={1} stopColor="#ef4444" stopOpacity={1} />
          </linearGradient>
        </defs>
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
          formatter={(value) => [formatCurrency(Number(value)), balanceLabel]}
          labelFormatter={(label) => formatMonth(String(label))}
          contentStyle={{
            borderRadius: '0.4rem',
            border: '1px solid rgba(34, 21, 13, 0.15)',
            backgroundColor: '#fdfaf0',
            boxShadow: '0 4px 6px -1px rgba(34, 21, 13, 0.08)',
          }}
        />
        <ReferenceLine y={0} stroke="rgba(34, 21, 13, 0.25)" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="cumulativeBalance"
          stroke={`url(#${strokeId})`}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
