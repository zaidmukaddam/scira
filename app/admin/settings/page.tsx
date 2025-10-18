"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SettingsDialog } from '@/components/settings-dialog';

export default function AdminSettingsPage() {
  const [open, setOpen] = useState(true);
  const fakeUser = { id: 'admin', name: 'Administrateur', email: 'admin@local' } as any;
  return (
    <div className="px-4 lg:px-6">
      <Card className="p-4">
        <SettingsDialog open={open} onOpenChange={setOpen} user={fakeUser} />
      </Card>
    </div>
  );
}
