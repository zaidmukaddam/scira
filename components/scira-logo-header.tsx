import React from 'react';
import { SouthernCrossLogo } from './logos/southerncross-logo';

export const SciraLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <SouthernCrossLogo variant="square" className="size-6" />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-foreground dark:text-foreground">SCX.ai</h2>
  </div>
);
