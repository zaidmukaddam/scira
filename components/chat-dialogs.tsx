import React from 'react';
import { Crown } from '@phosphor-icons/react';
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
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Unlimited searches</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">No daily limits or restrictions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Premium AI models</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Claude 4 Opus, Grok 3, GPT-4o and more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">PDF analysis</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Upload and analyze documents</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-medium text-neutral-900 dark:text-neutral-100">$15</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">/month</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Cancel anytime</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 text-sm font-normal border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Maybe later
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              className="flex-1 h-9 text-sm font-normal bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black"
            >
              Upgrade now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PostMessageUpgradeDialog.displayName = 'PostMessageUpgradeDialog';

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
      </>
    );
  },
);

ChatDialogs.displayName = 'ChatDialogs';
