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
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Crown className="w-4 h-4 text-primary-foreground" weight="fill" />
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/pricing';
              }}
              size="sm"
              className="flex-1"
            >
              <Crown className="h-3 w-3 mr-1.5" />
              Upgrade Now
            </Button>
          </div>

          {/* Additional info */}
          <p className="text-xs text-muted-foreground text-center">
            Start your free trial today. Cancel anytime.
          </p>
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
