import { cn } from '@/lib/utils';

export function ClassicLoader({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-6',
  };

  const barSizes = {
    sm: { height: '6px', width: '1.5px' },
    md: { height: '8px', width: '2px' },
    lg: { height: '10px', width: '2.5px' },
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <div className="absolute h-full w-full">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bg-primary absolute animate-[spinner-fade_1.2s_linear_infinite] rounded-full"
            style={{
              top: '0',
              left: '50%',
              marginLeft: size === 'sm' ? '-0.75px' : size === 'lg' ? '-1.25px' : '-1px',
              transformOrigin: `${size === 'sm' ? '0.75px' : size === 'lg' ? '1.25px' : '1px'} ${size === 'sm' ? '10px' : size === 'lg' ? '14px' : '12px'}`,
              transform: `rotate(${i * 30}deg)`,
              opacity: 0,
              animationDelay: `${i * 0.1}s`,
              height: barSizes[size].height,
              width: barSizes[size].width,
            }}
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
