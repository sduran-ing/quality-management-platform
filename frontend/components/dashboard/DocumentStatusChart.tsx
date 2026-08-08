'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Define the structure for chart data
interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface DocumentStatusChartProps {
  data: {
    draft: number;
    pending: number;
    approved: number;
  };
}

export default function DocumentStatusChart({ data }: DocumentStatusChartProps) {
  // Transform API data into chart format
  const chartData: ChartDataItem[] = [
    {
      name: 'Draft',
      value: data.draft,
      color: '#6B7280',  // Gray
    },
    {
      name: 'Pending Approval',
      value: data.pending,
      color: '#F59E0B',  // Amber
    },
    {
      name: 'Approved',
      value: data.approved,
      color: '#059669',  // Emerald (our primary color)
    },
  ].filter(item => item.value > 0);  // Only show statuses with documents

  // Calculate total for percentage display
  const total = data.draft + data.pending + data.approved;

  // Custom label to show percentages on the pie chart
  // Properly typed - Recharts provides these properties
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-body text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // If no documents, show empty state
  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400">
        <p className="font-body text-sm">No documents to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {/* Cell is deprecated but still works - we'll suppress the warning */}
            {/* @ts-ignore - Cell works fine, deprecation is for future versions */}
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          
          {/* Tooltip shows on hover */}
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            // Handle undefined value properly
            formatter={(value: number | string | undefined) => {
              const num = typeof value === 'number' ? value : 0;
              return [`${num} documents`, ''];
            }}
          />
          
          {/* Legend at bottom */}
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="font-body text-sm text-gray-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Color indicator */}
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-body text-sm text-gray-600">
                  {item.name}
                </span>
              </div>
              <span className="font-body text-sm font-medium text-gray-900">
                {item.value}
              </span>
            </div>
          ))}
        </div>
        
        {/* Total count */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="font-body text-sm font-medium text-gray-700">
            Total Documents
          </span>
          <span className="font-heading text-lg font-bold text-gray-900">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}