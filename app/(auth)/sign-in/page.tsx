'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignInContent() {
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/';

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue to SCX.ai"
      mode="sign-in"
      callbackURL={redirectTo}
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
