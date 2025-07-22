import React from 'react';
import { Crown, ArrowSquareOut } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';

interface PostMessageUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostMessageUpgradeDialog = React.memo(({ open, onOpenChange }: PostMessageUpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <Crown className="w-4 h-4 text-white dark:text-black" weight="fill" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Upgrade to Scira Pro</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Get unlimited access to all features</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Unlimited daily searches</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Access to all AI models</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Priority support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Early access to new features</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="flex-1 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              size="sm"
              className="flex-1 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black shadow-sm"
            >
              <Crown className="h-3 w-3 mr-1.5" />
              Upgrade Now
            </Button>
          </div>

          {/* Additional info */}
          <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
            Start your free trial today. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PostMessageUpgradeDialog.displayName = 'PostMessageUpgradeDialog';

interface ApiAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiAnnouncementDialog = React.memo(({ open, onOpenChange }: ApiAnnouncementDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 border border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <img src="/scira.png" alt="Scira" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  Introducing Scira AI API Platform
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Powerful APIs for developers</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Build the next generation of AI-powered applications with our comprehensive API suite.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Web Search API</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">People Discovery API</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">X Platform Search API</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-neutral-700 dark:text-neutral-300">Developer-friendly documentation</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="flex-1 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => {
                window.open('https://api.scira.ai/', '_blank');
                onOpenChange(false);
              }}
              size="sm"
              className="flex-1 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black shadow-sm"
            >
              <ArrowSquareOut className="h-3 w-3 mr-1.5" />
              Explore APIs
            </Button>
          </div>

          {/* Additional info */}
          <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
            Start building today with comprehensive documentation and examples.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ApiAnnouncementDialog.displayName = 'ApiAnnouncementDialog';

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
  showAnnouncementDialog: boolean;
  setShowAnnouncementDialog: (open: boolean) => void;
  hasShownAnnouncementDialog: boolean;
  setHasShownAnnouncementDialog: (value: boolean) => void;
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
    showAnnouncementDialog,
    setShowAnnouncementDialog,
    hasShownAnnouncementDialog,
    setHasShownAnnouncementDialog,
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

        {/* API Announcement Dialog */}
        <ApiAnnouncementDialog
          open={showAnnouncementDialog}
          onOpenChange={(open) => {
            setShowAnnouncementDialog(open);
            if (!open) {
              setHasShownAnnouncementDialog(true);
            }
          }}
        />
      </>
    );
  },
);

ChatDialogs.displayName = 'ChatDialogs';
