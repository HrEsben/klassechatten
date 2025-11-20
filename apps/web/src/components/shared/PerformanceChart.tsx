/**
 * PerformanceChart - Line chart for performance metrics using Recharts
 * Berlin Edgy design with sharp corners and strong contrast
 */

import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  timestamp: Date;
  value: number;
}

interface PerformanceChartProps {
  /** Chart title */
  title: string;
  /** Data points to plot */
  data: DataPoint[];
  /** Y-axis label */
  yAxisLabel: string;
  /** Threshold line value (optional) */
  threshold?: number;
  /** Chart height in pixels */
  height?: number;
  /** Chart color (CSS color) */
  color?: string;
}

export default function PerformanceChart({
  title,
  data,
  yAxisLabel,
  threshold,
  height = 300,
  color = '#ff3fa4', // primary color
}: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-base-100 border-2 border-base-content/10 shadow-lg p-6">
        <h3 className="text-lg font-black uppercase tracking-tight text-base-content mb-4">
          {title}
        </h3>
        <div className="flex items-center justify-center h-64 text-base-content/40">
          <p className="text-sm font-medium">Ingen data tilgængelig</p>
        </div>
      </div>
    );
  }

  // Sort data by timestamp and format for Recharts
  const sortedData = [...data]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(d => ({
      timestamp: d.timestamp.getTime(),
      value: d.value,
      formattedTime: format(d.timestamp, 'dd/MM HH:mm'),
    }));

  // Calculate statistics
  const values = sortedData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

  // Format value for display
  const formatValue = (value: number) => {
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(1)}s`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100 border-2 border-base-content/10 p-3 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-1">
            {payload[0].payload.formattedTime}
          </p>
          <p className="text-sm font-black text-base-content">
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-base-100 border-2 border-base-content/10 shadow-lg">
      {/* Header */}
      <div className="p-6 border-b-2 border-base-content/10">
        <h3 className="text-lg font-black uppercase tracking-tight text-base-content">
          {title}
        </h3>
        <p className="text-xs text-base-content/60 mt-1">
          {sortedData.length} datapunkter fra sidste 7 dage
        </p>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={sortedData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => format(new Date(timestamp), 'dd/MM')}
              stroke="currentColor"
              tick={{ fontSize: 10, fontWeight: 500 }}
              style={{ fill: 'currentColor' }}
            />
            <YAxis
              tickFormatter={formatValue}
              stroke="currentColor"
              tick={{ fontSize: 10, fontWeight: 500 }}
              style={{ fill: 'currentColor' }}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase' },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {threshold !== undefined && (
              <ReferenceLine
                y={threshold}
                stroke="#ffd966"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: 'Grænse',
                  position: 'right',
                  style: { fontSize: 10, fontWeight: 700, fill: '#ffd966', textTransform: 'uppercase' },
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="p-6 border-t-2 border-base-content/10 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">
            Minimum
          </p>
          <p className="text-lg font-black text-success">{formatValue(minValue)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">
            Gennemsnit
          </p>
          <p className="text-lg font-black text-base-content">{formatValue(avgValue)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">
            Maksimum
          </p>
          <p className="text-lg font-black text-error">{formatValue(maxValue)}</p>
        </div>
      </div>
    </div>
  );
}
