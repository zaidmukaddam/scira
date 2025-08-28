'use client';

import React, { useState } from 'react';
import { Plus, GlobeHemisphereWest, Lock, Copy, Check, Share, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentVisibility: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => Promise<void>;
  isOwner?: boolean;
}

export function ShareDialog({
  isOpen,
  onClose,
  chatId,
  currentVisibility,
  onVisibilityChange,
  isOwner = true,
}: ShareDialogProps) {
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate the share URL
  const shareUrl = chatId ? `https://scira.ai/search/${chatId}` : '';

  const handleMakePublic = async () => {
    if (currentVisibility === 'public') return;

    console.log('🔄 ShareDialog: Making chat public');
    setIsChangingVisibility(true);

    try {
      await onVisibilityChange('public');
      toast.success('Chat is now public and ready to share');
      console.log('✅ ShareDialog: Successfully made chat public');
    } catch (error) {
      console.error('❌ ShareDialog: Error making chat public:', error);
      toast.error('Failed to make chat public');
      onClose();
    } finally {
      setIsChangingVisibility(false);
    }
  };

  const handleMakePrivate = async () => {
    console.log('🔄 ShareDialog: Making chat private');
    setIsChangingVisibility(true);

    try {
      await onVisibilityChange('private');
      toast.success('Chat is now private');
      console.log('✅ ShareDialog: Successfully made chat private');
      onClose();
    } catch (error) {
      console.error('❌ ShareDialog: Error making chat private:', error);
      toast.error('Failed to make chat private');
    } finally {
      setIsChangingVisibility(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
      console.log('✅ ShareDialog: Link copied to clipboard');
    } catch (error) {
      console.error('❌ ShareDialog: Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Shared Chat - Scira',
          url: shareUrl,
        })
        .then(() => {
          console.log('✅ ShareDialog: Native share successful');
        })
        .catch((error) => {
          console.error('❌ ShareDialog: Native share failed:', error);
        });
    }
  };

  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    console.log('🔗 ShareDialog: Opened LinkedIn share');
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    console.log('🔗 ShareDialog: Opened Twitter share');
  };

  const handleShareReddit = (e: React.MouseEvent) => {
    e.preventDefault();
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
    console.log('🔗 ShareDialog: Opened Reddit share');
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Share size={20} />
              Share Chat
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClose}
              disabled={isChangingVisibility}
            >
              <X size={16} />
            </Button>
          </div>
          <DialogDescription>
            {currentVisibility === 'private'
              ? 'Make this chat public to share it with others.'
              : 'Your chat is public and ready to share.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentVisibility === 'private' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <Lock size={16} className="text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Chat is private</p>
                  <p className="text-xs text-muted-foreground">
                    Only you can see this chat
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleMakePublic}
                  disabled={isChangingVisibility}
                  className="w-full"
                >
                  {isChangingVisibility ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Making Public...
                    </>
                  ) : (
                    <>
                      <GlobeHemisphereWest size={16} className="mr-2" />
                      Make Public & Share
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Chat is public
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Anyone with the link can view this chat
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMakePrivate}
                  disabled={isChangingVisibility}
                  className="border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  <Lock size={12} className="mr-1" />
                  {isChangingVisibility ? 'Making Private...' : 'Make Private'}
                </Button>
              </div>

              {/* Copy Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2 border">
                  <div className="truncate flex-1 text-xs text-muted-foreground font-mono">
                    {shareUrl}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={handleCopyLink}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Share On</label>
                <div className="flex justify-center gap-2">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-10"
                      onClick={handleNativeShare}
                      title="Share using device"
                    >
                      <Share size={18} />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={handleShareLinkedIn}
                    title="Share on LinkedIn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={handleShareTwitter}
                    title="Share on X (Twitter)"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                    </svg>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={handleShareReddit}
                    title="Share on Reddit"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
