import { Loading03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: Omit<React.ComponentProps<'svg'>, 'size' | 'strokeWidth'>) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      role="status"
      aria-label="Loading"
      strokeWidth={1.5}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
