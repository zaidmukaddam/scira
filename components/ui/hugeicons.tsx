'use client';

import React from 'react';
import { HugeiconsIcon as BaseHugeiconsIcon } from '@hugeicons/react';

type BaseProps = React.ComponentProps<typeof BaseHugeiconsIcon>;

export function HugeiconsIcon({ strokeWidth: _ignored, ...rest }: BaseProps) {
  return <BaseHugeiconsIcon {...rest} strokeWidth={1.5} />;
}

export default HugeiconsIcon;
