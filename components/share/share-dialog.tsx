'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, X, Lock, LinkedinLogo, XLogo, RedditLogo } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Share03Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

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

  // Generate the share URL
  const shareUrl = chatId ? `https://scira.ai/search/${chatId}` : '';

  // Reset copied state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // Handle copy to clipboard
  const handleCopyLink = async () => {
    console.log('📋 Attempting to copy URL to clipboard:', shareUrl);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      console.log('✅ URL copied to clipboard successfully');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  // Handle visibility change to public and copy link
  const handleShareAndCopy = async () => {
    console.log('🔗 Share and copy initiated, chatId:', chatId);
    setIsChangingVisibility(true);

    try {
      if (selectedVisibilityType === 'private') {
        console.log('📡 Changing visibility to public');
        await onVisibilityChange('public');
        console.log('✅ Visibility changed to public successfully');
      }

      // Copy the link
      await handleCopyLink();
    } catch (error) {
      console.error('❌ Error in share and copy:', {
        chatId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error('Failed to share chat');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  // Handle making chat private
  const handleMakePrivate = async () => {
    console.log('🔒 Make private initiated, chatId:', chatId);
    setIsChangingVisibility(true);

    try {
      console.log('📡 Changing visibility to private');
      await onVisibilityChange('private');
      console.log('✅ Visibility changed to private successfully');
      toast.success('Chat is now private');
      console.log('🍞 Success toast shown: Chat is now private');

      // Close dialog after successful private change
      onOpenChange(false);
      console.log('🚪 Dialog closed after making private');
    } catch (error) {
      console.error('❌ Error making chat private:', {
        chatId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error('Failed to make chat private');
      console.log('🍞 Error toast shown: Failed to make chat private');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  // Social media share handlers
  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📱 Sharing to LinkedIn:', shareUrl);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📱 Sharing to Twitter:', shareUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareReddit = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('📱 Sharing to Reddit:', shareUrl);
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle native share API
  const handleNativeShare = async () => {
    console.log('📱 Using native share API:', shareUrl);
    try {
      await navigator.share({
        title: 'Shared Scira Chat',
        url: shareUrl,
      });
      console.log('✅ Native share completed');
    } catch (error) {
      console.error('❌ Native share failed:', error);
      // Fallback to copy
      await handleCopyLink();
    }
  };

  if (!chatId || !user || !isOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Share03Icon} size={20} color="currentColor" strokeWidth={2} />
            Share Chat
          </DialogTitle>
          <DialogDescription>
            {selectedVisibilityType === 'private'
              ? 'Share this chat to make it accessible to anyone with the link.'
              : 'This chat is already shared. Anyone with the link can access it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-1">
          {/* Share URL Display and Copy */}
          {selectedVisibilityType === 'public' && (
            <div className="space-y-4">
              {/* Make Private Option */}
              <div className="flex justify-between items-center px-1">
                <h4 className="text-sm font-medium">Share Link</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleMakePrivate}
                  disabled={isChangingVisibility}
                >
                  <Lock size={12} className="mr-1" />
                  {isChangingVisibility ? 'Making Private...' : 'Make Private'}
                </Button>
              </div>

              <div className="flex items-start gap-3 bg-muted/50 rounded-md p-3 border border-border">
                <div className="flex-1 text-xs sm:text-sm text-muted-foreground font-mono break-all word-break-break-all overflow-wrap-anywhere leading-relaxed">
                  <div className="max-h-16 sm:max-h-12 overflow-y-auto pr-1">{shareUrl}</div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 flex-shrink-0"
                  onClick={handleCopyLink}
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center px-1">Anyone with this link can view this chat</p>

              <Separator className="my-3" />

              {/* Compact Social Links and Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-1">
                {/* Social Share Options */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Share on:</span>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={handleNativeShare}
                      title="Share via system"
                    >
                      <HugeiconsIcon icon={Share03Icon} size={14} color="currentColor" strokeWidth={2} />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={handleShareLinkedIn}
                    title="Share on LinkedIn"
                  >
                    <LinkedinLogo size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={handleShareTwitter}
                    title="Share on X (Twitter)"
                  >
                    <XLogo size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={handleShareReddit}
                    title="Share on Reddit"
                  >
                    <RedditLogo size={14} />
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[36px] text-sm">
                    Cancel
                  </Button>
                  <Button onClick={handleCopyLink} className="min-h-[36px] text-sm">
                    <Copy size={14} className="mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons for Private Chats */}
          {selectedVisibilityType === 'private' && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 px-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="order-2 sm:order-1 min-h-[40px]">
                Cancel
              </Button>
              <Button
                onClick={handleShareAndCopy}
                disabled={isChangingVisibility}
                className="order-1 sm:order-2 min-h-[40px]"
              >
                <HugeiconsIcon icon={Share03Icon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                {isChangingVisibility ? 'Sharing...' : 'Share & Copy Link'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
