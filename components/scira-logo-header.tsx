import React from 'react';
import { SciraLogo } from './logos/scira-logo';

export const SciraLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <SciraLogo className="size-6.5" />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-foreground dark:text-foreground">Scira</h2>
  </div>
);
