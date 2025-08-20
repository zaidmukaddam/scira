import React from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, BinocularsIcon, BookOpen01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PostMessageUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostMessageUpgradeDialog = React.memo(({ open, onOpenChange }: PostMessageUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogTitle className="sr-only">Upgrade to Scira Pro</DialogTitle>

        {/* Header */}
        <div className="text-center space-y-2 pb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <HugeiconsIcon
              icon={Crown02Icon}
              size={24}
              color="currentColor"
              strokeWidth={1.5}
              className="text-primary"
            />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Unlock Pro Features</h2>
          <p className="text-sm text-muted-foreground">Get unlimited access and enhanced capabilities</p>
        </div>

        {/* Features */}
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HugeiconsIcon
                icon={BinocularsIcon}
                size={12}
                color="currentColor"
                strokeWidth={2}
                className="text-primary"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Scira Lookout</p>
              <p className="text-xs text-muted-foreground">Automated search monitoring on your schedule</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-3 h-3 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Unlimited Searches</p>
              <p className="text-xs text-muted-foreground">No daily limits on your research</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-3 h-3 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
              <p className="text-xs text-muted-foreground">Access to all AI models including Grok 4, Claude 4 Sonnet and GPT-5</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg
                className="w-3 h-3 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Priority Support</p>
              <p className="text-xs text-muted-foreground">Get help when you need it most</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={() => {
              window.location.href = '/pricing';
            }}
            className="w-full"
          >
            Upgrade to Pro
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Not now
          </Button>
        </div>

        {/* Additional info */}
        <p className="text-xs text-muted-foreground text-center pt-2">Cancel anytime • Secure payment</p>
      </DialogContent>
    </Dialog>
  );
});

PostMessageUpgradeDialog.displayName = 'PostMessageUpgradeDialog';

interface LookoutAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LookoutAnnouncementDialog = React.memo(({ open, onOpenChange }: LookoutAnnouncementDialogProps) => {
  const router = useRouter();
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        router.push('/lookout');
        onOpenChange(false);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        router.push('/blog');
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[85svh] sm:max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Introducing Scira Lookout</DialogTitle>
        {/* Hero Image */}
        <div className="relative h-40 sm:h-64">
          <Image
            src="/lookout-promo.png"
            alt="Scira Lookout"
            width={1200}
            height={630}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium">
              New
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                Introducing Scira Lookout
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Automated search monitoring that runs on your schedule. Set up searches that track trends, monitor
                developments, and keep you informed without manual effort.
              </p>
            </div>
          </div>

          {/* Key capabilities */}
          <div className="space-y-4">
            <h3 className="text-xs sm:text-sm font-medium text-foreground uppercase tracking-wide">Key Capabilities</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
                <span className="text-foreground">Schedule searches to run automatically</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
                <span className="text-foreground">Receive notifications when results are ready</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
                <span className="text-foreground">Access comprehensive search history</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  router.push('/lookout');
                  onOpenChange(false);
                }}
                className="w-full sm:flex-1 group"
              >
                <HugeiconsIcon icon={BinocularsIcon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Explore Lookout
                <span className="sm:ml-auto text-base font-mono hidden sm:inline">⌘ ⏎</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push('/blog');
                  onOpenChange(false);
                }}
                className="w-full sm:flex-1 group shadow-none"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Read Blog
                <span className="sm:ml-auto font-mono text-base hidden sm:inline">{isMac ? '⌘' : 'Ctrl'} B</span>
              </Button>
            </div>
            <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm" className="w-full">
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

LookoutAnnouncementDialog.displayName = 'LookoutAnnouncementDialog';

interface ChatDialogsProps {
  commandDialogOpen: boolean;
  setCommandDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
  setShowSignInPrompt: (open: boolean) => void;
  hasShownSignInPrompt: boolean;
  setHasShownSignInPrompt: (value: boolean) => void;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
  hasShownUpgradeDialog: boolean;
  setHasShownUpgradeDialog: (value: boolean) => void;
  showLookoutAnnouncement: boolean;
  setShowLookoutAnnouncement: (open: boolean) => void;
  hasShownLookoutAnnouncement: boolean;
  setHasShownLookoutAnnouncement: (value: boolean) => void;
  user: any;
  setAnyDialogOpen: (open: boolean) => void;
}

export const ChatDialogs = React.memo(
  ({
    commandDialogOpen,
    setCommandDialogOpen,
    showSignInPrompt,
    setShowSignInPrompt,
    hasShownSignInPrompt,
    setHasShownSignInPrompt,
    showUpgradeDialog,
    setShowUpgradeDialog,
    hasShownUpgradeDialog,
    setHasShownUpgradeDialog,
    showLookoutAnnouncement,
    setShowLookoutAnnouncement,
    hasShownLookoutAnnouncement,
    setHasShownLookoutAnnouncement,
    user,
    setAnyDialogOpen,
  }: ChatDialogsProps) => {
    return (
      <>
        {/* Chat History Dialog */}
        <ChatHistoryDialog
          open={commandDialogOpen}
          onOpenChange={(open) => {
            setCommandDialogOpen(open);
            setAnyDialogOpen(open);
          }}
          user={user}
        />

        {/* Sign-in Prompt Dialog */}
        <SignInPromptDialog
          open={showSignInPrompt}
          onOpenChange={(open) => {
            setShowSignInPrompt(open);
            if (!open) {
              setHasShownSignInPrompt(true);
            }
          }}
        />

        {/* Post-Message Upgrade Dialog */}
        <PostMessageUpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={(open) => {
            setShowUpgradeDialog(open);
            if (!open) {
              setHasShownUpgradeDialog(true);
            }
          }}
        />

        {/* Lookout Announcement Dialog */}
        <LookoutAnnouncementDialog
          open={showLookoutAnnouncement}
          onOpenChange={(open) => {
            setShowLookoutAnnouncement(open);
            if (!open) {
              setHasShownLookoutAnnouncement(true);
            }
          }}
        />
      </>
    );
  },
);

ChatDialogs.displayName = 'ChatDialogs';
