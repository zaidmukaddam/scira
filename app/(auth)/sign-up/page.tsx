'use client';

import { useEffect } from 'react';

export default function SignUpPage() {
  useEffect(() => {
    window.location.href = '/sign-in';
  }, []);
  return null;
}
