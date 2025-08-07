import React from 'react';
import Image from 'next/image';

export const SciraLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <Image
      src="/scira.png"
      alt="Scira"
      className="size-7 invert dark:invert-0"
      width={100}
      height={100}
      unoptimized
      quality={100}
      priority
    />
    <h2 className="text-xl font-normal font-be-vietnam-pro text-foreground dark:text-foreground">Scira</h2>
  </div>
);