'use client';

import AuthCard from '@/components/auth-card';

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue to SCX.ai"
      mode="sign-in"
    />
  );
}
