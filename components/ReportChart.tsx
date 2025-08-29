
import React from 'react';

// Recharts is loaded from a CDN, so we declare its expected global object shape for TypeScript.
declare global {
    interface Window {
        Recharts: any;
    }
}

export interface ChartSeries {
    name: string;
    color: string;
}

interface ReportChartProps {
  chartData: any[]; // Pre-merged data for recharts
  series: ChartSeries[];
  title: string;
  formatAs?: 'currency' | 'percent' | 'days' | 'integer';
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, formatAs }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-2 border border-slate-600 rounded-md shadow-lg">
        <p className="label text-slate-300">{`${label}`}</p>
        {payload.map((p: any) => {
          const value = p.value;
          let formattedValue = typeof value === 'number' ? value.toLocaleString('en-US') : 'N/A';
          
          if (typeof value === 'number') {
              switch (formatAs) {
                case 'currency':
                    formattedValue = value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                    break;
                case 'percent':
                    formattedValue = `${(value * 100).toFixed(2)}%`;
                    break;
              }
          }
          return (
            <p key={p.name} style={{ color: p.color }}>{`${p.name}: ${formattedValue}`}</p>
          )
        })}
      </div>
    );
  }
  return null;
};

const ReportChart: React.FC<ReportChartProps> = ({ chartData, series, title, formatAs }) => {
  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = window.Recharts || {};

  if (!ResponsiveContainer) {
    return (
        <div className="bg-slate-700/50 p-4 rounded-lg flex items-center justify-center" style={{ width: '100%', height: 250 }}>
          <p className="text-slate-400">Loading chart component...</p>
        </div>
    );
  }
    
  const yAxisFormatter = (value: number) => {
    switch (formatAs) {
        case 'currency':
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
        case 'percent':
            return `${(value * 100).toFixed(0)}%`;
        case 'integer':
             if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
             if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
             return value.toString();
        default:
             return value.toString();
    }
  };

  const xAxisFormatter = (dateStr: string) => {
      // Handles potential invalid date strings gracefully
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      } catch (e) {
        return dateStr;
      }
  };

  return (
    <div className="bg-slate-700/50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                tick={{ fontSize: 12 }} 
                tickFormatter={xAxisFormatter}
                interval="preserveStartEnd"
                minTickGap={60}
             />
            <YAxis 
                stroke="#94a3b8" 
                tickFormatter={yAxisFormatter} 
                tick={{ fontSize: 12 }} 
                domain={['dataMin', 'dataMax']}
                width={formatAs === 'currency' ? 60 : 40}
            />
            <Tooltip 
                content={<CustomTooltip formatAs={formatAs} />}
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
            />
            <Legend wrapperStyle={{fontSize: "14px", paddingTop: "10px"}} />
            {series.map(s => (
                <Line 
                    key={s.name}
                    type="monotone" 
                    dataKey={s.name}
                    name={s.name} 
                    stroke={s.color}
                    strokeWidth={2} 
                    dot={false} 
                    connectNulls 
                    activeDot={{ r: 5, strokeWidth: 2 }}
                />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportChart;
