import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { ExpenseByCategoryItem, ExpenseCategory } from '@/types';

interface CategoryPieChartProps {
  data: ExpenseByCategoryItem[];
  formatCurrency: (value: number) => string;
  getCategoryLabel: (category: string) => string;
}

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

const FALLBACK_COLOR = '#7D6B5D';

export default function CategoryPieChart({
  data,
  formatCurrency,
  getCategoryLabel,
}: CategoryPieChartProps) {
  if (data.length === 0) {
    return null;
  }

  const chartData = data.map((item) => ({
    ...item,
    name: getCategoryLabel(item.category),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLORS[data[index].category] || FALLBACK_COLOR}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            borderRadius: '0.4rem',
            border: '1px solid rgba(34, 21, 13, 0.15)',
            backgroundColor: '#fdfaf0',
            boxShadow: '0 4px 6px -1px rgba(34, 21, 13, 0.08)',
          }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
