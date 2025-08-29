
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  change?: number | null;
  // Determines color: 'up' means positive change is good (green), 'down' means negative change is good (green)
  changeDirection?: 'up' | 'down';
  changeLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, change, changeDirection = 'up', changeLabel = "YoY" }) => {
  const hasChange = typeof change === 'number';
  
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  let changeColor = 'text-slate-400'; // Neutral for 0%
  if (isPositive) {
    changeColor = changeDirection === 'up' ? 'text-green-400' : 'text-red-400';
  } else if (isNegative) {
    changeColor = changeDirection === 'up' ? 'text-red-400' : 'text-green-400';
  }

  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="bg-slate-700/50 p-4 rounded-lg text-center flex flex-col justify-between min-h-[110px]">
      <p className="text-sm text-slate-400 mb-1 truncate" title={label}>{label}</p>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        {hasChange ? (
          <p className={`text-xs font-semibold flex items-center justify-center gap-1 ${changeColor} mt-1`}>
            <span>{arrow}</span>
            <span>{Math.abs(change).toFixed(1)}% {changeLabel}</span>
          </p>
        ) : (
          // Add a placeholder to maintain layout consistency
          <p className="text-xs font-semibold mt-1">&nbsp;</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
