import React from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceholderImageProps {
  className?: string;
}

const PlaceholderImage: React.FC<PlaceholderImageProps> = ({ className }) => {
  return (
    <div 
      className={cn(
        "w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800",
        className
      )}
    >
      <ImageIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
    </div>
  );
};

export default PlaceholderImage;