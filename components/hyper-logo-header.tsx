import React from 'react';
import { HyperLogo } from './logos/hyper-logo';

export const HyperLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <HyperLogo className="size-7" />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-foreground dark:text-foreground">Hyper</h2>
  </div>
);
