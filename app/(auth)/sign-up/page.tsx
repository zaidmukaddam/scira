import { Suspense } from 'react';
import AuthCard from '@/components/auth-card';

function SignUpContent() {
  return (
    <AuthCard
      title="Create an account"
      description="Join 100K+ researchers using AI-powered search with real-time citations."
      mode="sign-up"
    />
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}
