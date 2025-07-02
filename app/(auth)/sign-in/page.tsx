'use client';

import AuthCard from '@/components/auth-card';
import { useGT } from 'gt-next';

export default function SignInPage() {
  const t = useGT();
  return (
    <AuthCard title={t('Sign in')} description={t('Sign in to your account using your preferred provider')} mode="sign-in" />
  );
}
