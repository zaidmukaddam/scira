import React from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { BinocularsIcon, BookOpen01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckIcon } from 'lucide-react';

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
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 max-h-[85svh] sm:max-h-[90vh] overflow-y-auto bg-background"
        showCloseButton={false}
      >
        <DialogHeader className="p-0">
          <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-lg">
            <Image
              src="/lookout-promo.png"
              alt="Scira Lookout"
              width={1200}
              height={630}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-3">
                New Feature
              </div>
              <DialogTitle className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Introducing Scira Lookout
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-1">
                Automated search monitoring on your schedule
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Set up searches that track trends, monitor developments, and keep you informed without manual effort.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Schedule searches to run automatically</span>
              </div>
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Receive notifications when results are ready</span>
              </div>
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Access comprehensive search history</span>
              </div>
            </div>
          </div>

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
                <span className="sm:ml-auto text-xs font-mono hidden sm:inline opacity-60">⌘ ⏎</span>
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
                <span className="sm:ml-auto font-mono text-xs hidden sm:inline opacity-60">
                  {isMac ? '⌘' : 'Ctrl'} B
                </span>
              </Button>
            </div>

            <div className="flex gap-2 w-full items-center mt-4">
              <div className="flex-1 border-b border-foreground/10" />
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs px-3"
              >
                Maybe later
              </Button>
              <div className="flex-1 border-b border-foreground/10" />
            </div>
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
