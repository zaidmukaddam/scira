import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: 'primary' | 'warning' | 'success' | 'danger';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
  label,
  color = 'primary',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDasharray = `${progress * circumference}, ${circumference}`;

  const colorClasses = {
    primary: 'stroke-primary',
    warning: 'stroke-orange-500',
    success: 'stroke-green-500',
    danger: 'stroke-red-500',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className="stroke-muted"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          className={cn(colorClasses[color], 'transition-all duration-300')}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          style={{
            transition: 'stroke-dasharray 0.3s ease-in-out',
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-foreground">
            {value}/{max}
          </span>
          {label && <span className="text-[10px] text-muted-foreground leading-none">{label}</span>}
        </div>
      )}
    </div>
  );
};
