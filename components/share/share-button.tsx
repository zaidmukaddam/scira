'use client';

import React, { useState } from 'react';
import { GlobeHemisphereWestIcon, CopyIcon, ShareFatIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { Share03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ShareDialog } from './share-dialog';

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
              <HugeiconsIcon icon={Share03Icon} size={14} color="currentColor" strokeWidth={2} />
              <span className="text-sm font-medium">Share</span>
            </>
          );
        }
      case 'button':
        return (
          <>
            Share
            <ShareFatIcon weight="fill" size={16} color="currentColor" strokeWidth={2} />
          </>
        );
      case 'icon':
      default:
        return (
          <HugeiconsIcon
            icon={Share03Icon}
            size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
            color="currentColor"
            strokeWidth={2}
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
            <TooltipContent>{tooltipContent}</TooltipContent>
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
