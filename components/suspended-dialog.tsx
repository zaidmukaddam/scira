'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SuspendedDialogProps {
  open: boolean;
}

export function SuspendedDialog({ open }: SuspendedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Compte suspendu</DialogTitle>
          <DialogDescription className="pt-4 text-sm">
            Votre compte a été suspendu. Veuillez contacter l'administrateur pour rétablir l'accès.
          </DialogDescription>
        </DialogHeader>
        <div className="text-xs text-muted-foreground text-center pt-2">
          Code: SUSPENDED
        </div>
      </DialogContent>
    </Dialog>
  );
}
