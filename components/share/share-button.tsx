'use client';

import React, { useState } from 'react';
import { GlobeHemisphereWest, Copy } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
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

  // Don't render if user is not owner or no user
  if (!user || !isOwner || !chatId) {
    return null;
  }

  const handleClick = () => {
    console.log('🔗 Share button clicked, opening dialog');
    setIsDialogOpen(true);
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'navbar':
        if (selectedVisibilityType === 'public') {
          return (
            <>
              <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Shared</span>
              <Copy size={14} className="ml-1 text-blue-600 dark:text-blue-400 opacity-70" />
            </>
          );
        } else {
          return (
            <>
              <HugeiconsIcon
                icon={Share03Icon}
                size={14}
                color="currentColor"
                strokeWidth={2}
                className="text-muted-foreground"
              />
              <span className="text-sm font-medium text-muted-foreground">Share</span>
            </>
          );
        }
      case 'button':
        return (
          <>
            <HugeiconsIcon icon={Share03Icon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
            {selectedVisibilityType === 'public' ? 'Manage Share' : 'Share'}
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
          variant: 'secondary' as const,
          size: 'sm' as const,
          className: `${className} ${
            selectedVisibilityType === 'public'
              ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800'
              : ''
          }`,
        };
      case 'button':
        return {
          ...baseProps,
          variant: 'default' as const,
          size: size === 'sm' ? ('sm' as const) : ('default' as const),
        };
      case 'icon':
      default:
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: 'icon' as const,
          className: `${className} ${size === 'sm' ? 'size-8' : size === 'lg' ? 'size-10' : 'size-9'}`,
        };
    }
  };

  const button = <Button {...getButtonProps()}>{getButtonContent()}</Button>;

  const tooltipContent = selectedVisibilityType === 'public' ? 'Manage sharing settings' : 'Share this chat';

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
