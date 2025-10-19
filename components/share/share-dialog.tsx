'use client';

import React, { useState, useEffect } from 'react';
import {
  CopyIcon,
  CheckIcon,
  GlobeIcon,
  LockIcon,
  LinkedinLogoIcon,
  XLogoIcon,
  RedditLogoIcon,
} from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Share03Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  selectedVisibilityType: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => Promise<void>;
  isOwner?: boolean;
  user?: any;
}

export function ShareDialog({
  isOpen,
  onOpenChange,
  chatId,
  selectedVisibilityType,
  onVisibilityChange,
  isOwner = true,
  user,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);

  const shareUrl = chatId ? `https://scira.ai/search/${chatId}` : '';

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShareAndCopy = async () => {
    setIsChangingVisibility(true);

    try {
      if (selectedVisibilityType === 'private') {
        await onVisibilityChange('public');
      }
      await handleCopyLink();
    } catch (error) {
      console.error('Error sharing chat:', error);
      toast.error('Failed to share chat');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  const handleMakePrivate = async () => {
    setIsChangingVisibility(true);

    try {
      await onVisibilityChange('private');
      toast.success('Chat is now private');
      onOpenChange(false);
    } catch (error) {
      console.error('Error making chat private:', error);
      toast.error('Failed to make chat private');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareReddit = (e: React.MouseEvent) => {
    e.preventDefault();
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: 'Shared Scira Chat',
        url: shareUrl,
      });
    } catch (error) {
      await handleCopyLink();
    }
  };

  if (!chatId || !user || !isOwner) {
    return null;
  }

  const isPublic = selectedVisibilityType === 'public';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] gap-0 p-0 border-0 shadow-lg">
        <div className="px-6 pt-6 pb-5">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-base font-semibold tracking-tight">Share</DialogTitle>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground pt-0.5">
              {isPublic ? (
                <>
                  <div className="flex items-center justify-center rounded-full bg-primary/10 size-[18px]">
                    <GlobeIcon size={11} className="text-primary" weight="fill" />
                  </div>
                  <span>Public link - Anyone can view</span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center rounded-full bg-muted size-[18px]">
                    <LockIcon size={11} weight="fill" />
                  </div>
                  <span>Private - Only you can view</span>
                </>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {isPublic ? (
            <div className="space-y-4">
              {/* Link Copy - Main Focus */}
              <div className="group relative overflow-hidden rounded-lg border bg-muted/40 transition-colors hover:bg-muted/60">
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  <div className="flex-1 min-w-0 relative">
                    <code 
                      className="text-[13px] text-foreground/70 block font-medium pr-12"
                      style={{
                        maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                      }}
                    >
                      {shareUrl}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyLink}
                    className={cn(
                      "h-8 px-3 shrink-0 font-medium text-xs transition-all absolute right-2",
                      copied 
                        ? "text-green-600 dark:text-green-500" 
                        : "hover:bg-background/80"
                    )}
                  >
                    {copied ? (
                      <>
                        <CheckIcon size={14} className="mr-1.5" weight="bold" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} className="mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Share - Streamlined */}
              <div className="flex items-center gap-2">
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNativeShare}
                    className="flex-1 h-9 font-medium"
                  >
                    <HugeiconsIcon icon={Share03Icon} size={15} strokeWidth={2} className="mr-2" />
                    Share
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareLinkedIn}
                  title="Share on LinkedIn"
                  className="h-9 w-9 shrink-0"
                >
                  <LinkedinLogoIcon size={17} weight="fill" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareTwitter}
                  title="Share on X"
                  className="h-9 w-9 shrink-0"
                >
                  <XLogoIcon size={17} weight="fill" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareReddit}
                  title="Share on Reddit"
                  className="h-9 w-9 shrink-0"
                >
                  <RedditLogoIcon size={17} weight="fill" />
                </Button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMakePrivate}
                  disabled={isChangingVisibility}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  <LockIcon size={14} className="mr-1.5" />
                  Make Private
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 text-xs -mr-2"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Private State - Premium Look */}
              <div className="rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-dashed p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center justify-center rounded-full bg-background size-10 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                    <GlobeIcon size={18} className="text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1.5">
                  Share this conversation
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                  Create a public link that anyone can access
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleShareAndCopy} 
                  disabled={isChangingVisibility}
                  className="flex-1 h-10 font-medium"
                >
                  {isChangingVisibility ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <GlobeIcon size={16} className="mr-2" weight="fill" />
                      Create Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
