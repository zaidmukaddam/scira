'use client';

import React, { useState } from 'react';
import { GlobeHemisphereWestIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ShareDialog } from './share-dialog';

function IconArrowOutOfBox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3.75V15M12 3.75L16.5 8.25M12 3.75L7.5 8.25M20.25 14.75V17.25C20.25 18.9069 18.9069 20.25 17.25 20.25H6.75C5.09315 20.25 3.75 18.9069 3.75 17.25V14.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ShareButtonProps {
  chatId: string | null;
  selectedVisibilityType: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => Promise<void>;
  isOwner?: boolean;
  user?: any;
  variant?: 'icon' | 'button' | 'navbar';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function ShareButton({
  chatId,
  selectedVisibilityType,
  onVisibilityChange,
  isOwner = true,
  user,
  variant = 'icon',
  size = 'md',
  className = '',
  disabled = false,
}: ShareButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!user || !isOwner || !chatId) {
    return null;
  }

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'navbar':
        if (selectedVisibilityType === 'public') {
          return (
            <>
              <div className="flex items-center justify-center rounded-full bg-primary/10 size-[18px]">
                <GlobeHemisphereWestIcon size={11} weight="fill" className="text-primary" />
              </div>
              <span className="text-sm font-medium">Public</span>
            </>
          );
        } else {
          return (
            <>
              <IconArrowOutOfBox className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Share</span>
            </>
          );
        }
      case 'button':
        return (
          <>
            Share
            <IconArrowOutOfBox className="h-4 w-4" />
          </>
        );
      case 'icon':
      default:
        return (
          <IconArrowOutOfBox
            className={
              size === 'sm'
                ? 'h-3.5 w-3.5'
                : size === 'lg'
                  ? 'h-5 w-5'
                  : 'h-4 w-4'
            }
          />
        );
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      onClick: handleClick,
      disabled,
      className,
    };

    switch (variant) {
      case 'navbar':
        return {
          ...baseProps,
          variant: selectedVisibilityType === 'public' ? ('secondary' as const) : ('ghost' as const),
          size: 'sm' as const,
          className: `${className} !h-8 px-3 gap-2 font-medium transition-all ${selectedVisibilityType === 'public' ? 'bg-primary/5 hover:bg-primary/10 border-primary/20' : ''
            }`,
        };
      case 'button':
        return {
          ...baseProps,
          variant: 'default' as const,
          size: size === 'sm' ? ('sm' as const) : ('default' as const),
          className: `${className} font-medium`,
        };
      case 'icon':
      default:
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: 'icon' as const,
          className: className || (size === 'sm' ? 'size-8' : size === 'lg' ? 'size-10' : 'size-9'),
        };
    }
  };

  const button = <Button {...getButtonProps()}>{getButtonContent()}</Button>;

  const tooltipContent = selectedVisibilityType === 'public' ? 'Manage sharing' : 'Share chat';

  return (
    <>
      {variant === 'icon' ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>{tooltipContent}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <ShareDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        chatId={chatId}
        selectedVisibilityType={selectedVisibilityType}
        onVisibilityChange={onVisibilityChange}
        isOwner={isOwner}
        user={user}
      />
    </>
  );
}
