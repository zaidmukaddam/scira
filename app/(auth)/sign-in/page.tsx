'use client';

import AuthCard from '@/components/auth-card';

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your research history and continue where you left off."
      mode="sign-in"
    />
  );
}
