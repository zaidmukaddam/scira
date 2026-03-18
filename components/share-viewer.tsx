'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sileo } from 'sileo';
import { Copy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Messages from '@/components/messages';
import { ShareAttachmentsBadge } from '@/components/share/share-attachments-badge';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { forkChat } from '@/app/actions';
import { Attachment, ChatMessage } from '@/lib/types';
import { SciraLogo } from '@/components/logos/scira-logo';

interface ShareViewerProps {
  chatId: string;
  chatTitle: string;
  shareUrl: string;
  messages: ChatMessage[];
  isSignedIn: boolean;
  sharedBy: string;
}

export function ShareViewer({ chatId, chatTitle, shareUrl, messages, isSignedIn, sharedBy }: ShareViewerProps) {
  const router = useRouter();
  const { state } = useSidebar();
  const [isForking, startTransition] = useTransition();
  const [shareMessages, setShareMessages] = useState(messages);
  const [input, setInput] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const lastUserMessageIndex = useMemo(() => {
    for (let index = shareMessages.length - 1; index >= 0; index -= 1) {
      if (shareMessages[index]?.role === 'user') return index;
    }
    return -1;
  }, [shareMessages]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      sileo.success({ 
        title: 'Link copied',
        description: 'You can now paste it anywhere',
        icon: <Copy className="h-4 w-4" />,
        button: {
          title: 'Open link',
          onClick: () => window.open(shareUrl, '_blank', 'noopener,noreferrer')
        }
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      sileo.error({ 
        title: 'Failed to copy link',
        description: 'Please try again',
        icon: <Copy className="h-4 w-4" />
      });
    }
  };

  const handleFork = () => {
    if (!isSignedIn) {
      const nextUrl = `/share/${chatId}`;
      router.push(`/sign-in?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    startTransition(async () => {
      const result = await forkChat(chatId);
      if (!result.success || !result.newChatId) {
        sileo.error({ title: result.error || 'Failed to fork chat' });
        return;
      }
      router.push(`/search/${result.newChatId}`);
    });
  };

  const headerOffsetClassName =
    state === 'expanded' ? 'md:left-[calc(var(--sidebar-width))] md:right-0' : 'md:left-[calc(var(--sidebar-width-icon))] md:right-0';
  const floatingBarClassName = cn(
    'fixed bottom-0 z-20 left-0 right-0',
    headerOffsetClassName,
  );

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 border-b border-border/40',
          headerOffsetClassName,
        )}
      >
        <div className="flex w-full max-w-2xl mx-auto items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="md:hidden">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            <Avatar className="size-7 rounded-md shrink-0">
              <AvatarFallback className="rounded-md text-xs size-7 bg-muted">
                {sharedBy.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">{chatTitle}</h1>
              <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                by {sharedBy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 w-7 p-0 rounded-lg" title="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 pb-28 pt-14">
        <div className="w-full">
          <Messages
            messages={shareMessages}
            lastUserMessageIndex={lastUserMessageIndex}
            input={input}
            setInput={setInput}
            setMessages={setShareMessages}
            regenerate={async () => {}}
            stop={async () => {}}
            sendMessage={async () => {}}
            suggestedQuestions={suggestedQuestions}
            setSuggestedQuestions={setSuggestedQuestions}
            status="ready"
            error={null}
            selectedVisibilityType="public"
            chatId={chatId}
            initialMessages={messages}
            isOwner={false}
            attachmentsRenderer={(attachments: Attachment[]) => <ShareAttachmentsBadge attachments={attachments} />}
          />
        </div>

        {/* Floating bar */}
        <div className={floatingBarClassName}>
          <div className="w-full max-w-2xl mx-auto px-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/50 bg-background/90 backdrop-blur-xl px-4 py-3 shadow-lg shadow-black/5">
              {/* Top row on mobile / left side on desktop */}
              <div className="flex items-center gap-3 min-w-0">
                <SciraLogo className="size-5 shrink-0 text-foreground/70" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">You&apos;re viewing a shared chat</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                    {isSignedIn ? 'Copy it to your account to keep the conversation going' : 'Sign in to continue this conversation'}
                  </p>
                </div>
              </div>
              {/* Bottom row on mobile / right side on desktop */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-8 text-xs rounded-lg gap-1.5 px-2.5 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                  Copy link
                </Button>
                {isSignedIn ? (
                  <Button size="sm" onClick={handleFork} disabled={isForking} className="h-8 text-xs rounded-lg gap-1.5 px-3 flex-1 sm:flex-none">
                    {isForking ? 'Copying…' : 'Continue in my account'}
                    {!isForking && <ArrowRight className="h-3 w-3" />}
                  </Button>
                ) : (
                  <Button size="sm" asChild className="h-8 text-xs rounded-lg gap-1.5 px-3 flex-1 sm:flex-none">
                    <Link href={`/sign-in?next=${encodeURIComponent(`/share/${chatId}`)}`}>
                      Sign in to continue
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
