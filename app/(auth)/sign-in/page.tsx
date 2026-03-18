import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignInContent() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your research history and continue where you left off."
      mode="sign-in"
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
