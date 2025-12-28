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
import { HugeiconsIcon } from '@/components/ui/hugeicons';
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
  const [choice, setChoice] = useState<'public' | 'private'>(selectedVisibilityType);
  const [isShared, setIsShared] = useState<boolean>(selectedVisibilityType === 'public');

  const shareUrl = chatId ? `https://scira.ai/search/${chatId}` : '';

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setChoice(selectedVisibilityType);
    setIsShared(selectedVisibilityType === 'public');
  }, [selectedVisibilityType]);

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
      await onVisibilityChange('public');
      setChoice('public');
      setIsShared(true);
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
      setChoice('private');
      setIsShared(false);
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

  const isPublic = isShared;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-100 sm:max-w-130 gap-0 p-0 border-0 shadow-lg">
        <div className="px-6 pt-6 pb-5">
          <DialogHeader className="space-y-1 pb-0">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {isPublic ? 'Chat shared' : 'Share chat'}
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground pt-0.5">
              {isPublic ? 'Future messages aren’t included' : 'Only messages up until now will be shared'}
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 overflow-x-hidden">
          {isPublic ? (
            <div className="space-y-4">
              {/* Access options (interactive in shared state) */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={handleMakePrivate}
                  disabled={isChangingVisibility}
                  className={cn('w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/50')}
                >
                  <div className="mt-0.5">
                    <LockIcon size={16} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Private</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Only you have access</p>
                  </div>
                </button>
                <Separator />
                <button
                  type="button"
                  aria-disabled
                  className={cn('w-full flex items-start gap-3 px-5 py-4 text-left cursor-default')}
                >
                  <div className="mt-0.5">
                    <GlobeIcon size={16} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Public access</p>
                      <CheckIcon size={16} className="text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Anyone with the link can view</p>
                  </div>
                </button>
              </div>

              {/* Link with Copy button - overflow masked under button */}
              <div className="group relative overflow-hidden rounded-2xl border bg-muted/40 ">
                <div className="px-4 py-3 overflow-x-hidden">
                  <code
                    className="text-[13px] text-foreground/70 font-medium truncate! text-wrap block"
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
                  variant="default"
                  onClick={handleCopyLink}
                  className={cn(
                    'h-9 px-3 font-medium text-xs absolute right-1 top-1/2 -translate-y-1/2',
                    copied && 'bg-primary hover:bg-primary',
                  )}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Access options */}
              <div className="rounded-2xl border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setChoice('private')}
                  className={cn('w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/50')}
                >
                  <div className="mt-0.5">
                    <LockIcon size={16} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Private</p>
                      {choice === 'private' && <CheckIcon size={16} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Only you have access</p>
                  </div>
                </button>
                <Separator />
                <button
                  type="button"
                  onClick={handleShareAndCopy}
                  className={cn('w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/50')}
                >
                  <div className="mt-0.5">
                    <GlobeIcon size={16} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Public access</p>
                      {choice === 'public' && <CheckIcon size={16} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Anyone with the link can view</p>
                  </div>
                </button>
              </div>

              <p className="text-[12px] text-muted-foreground">
                Don&apos;t share personal information or third-party content without permission, and see our
                <span className="px-0.5" />
                <a className="underline" href="/privacy-policy" target="_blank" rel="noreferrer">
                  Usage Policy
                </a>
                .
              </p>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={async () => {
                    // Ensure we switch to public before creating link
                    if (choice === 'private') {
                      await onVisibilityChange('public');
                    }
                    await handleShareAndCopy();
                  }}
                  disabled={isChangingVisibility}
                  className="h-10 px-4 font-medium"
                >
                  {isChangingVisibility ? 'Creating…' : 'Create share link'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
