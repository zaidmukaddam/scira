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
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <DialogTitle className="sr-only">Upgrade to Scira Pro</DialogTitle>
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <HugeiconsIcon
                  icon={Crown02Icon}
                  size={16}
                  color="currentColor"
                  strokeWidth={1.5}
                  className="text-primary-foreground"
                />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">Upgrade to Scira Pro</h2>
                <p className="text-sm text-muted-foreground">Get unlimited access to all features</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-foreground">Unlimited daily searches</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-foreground">Access to all AI models</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-foreground">Priority support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-foreground">Early access to new features</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              size="sm"
              className="flex-1"
            >
              <HugeiconsIcon icon={Crown02Icon} size={12} color="currentColor" strokeWidth={1.5} className="mr-1.5" />
              Upgrade Now
            </Button>
          </div>

          {/* Additional info */}
          <p className="text-xs text-muted-foreground text-center">Start your free trial today. Cancel anytime.</p>
        </div>
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
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Introducing Scira Lookout</DialogTitle>
        {/* Hero Image */}
        <div className="relative h-64">
          <Image
            src="/lookout-promo.png"
            alt="Scira Lookout"
            width={1200}
            height={630}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium">
              New
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">Introducing Scira Lookout</h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                Automated search monitoring that runs on your schedule. Set up searches that track trends, monitor
                developments, and keep you informed without manual effort.
              </p>
            </div>
          </div>

          {/* Key capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">Key Capabilities</h3>
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
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  router.push('/lookout');
                  onOpenChange(false);
                }}
                className="flex-1 group"
              >
                <HugeiconsIcon icon={BinocularsIcon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Explore Lookout
                <span className="ml-auto text-base font-mono">⌘ ⏎</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push('/blog');
                  onOpenChange(false);
                }}
                className="flex-1 group shadow-none"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Read Blog
                <span className="ml-auto font-mono text-base">{isMac ? '⌘' : 'Ctrl'} B</span>
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
