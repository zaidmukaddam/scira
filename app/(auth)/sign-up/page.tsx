'use client';

import AuthCard from '@/components/auth-card';
import { useGT } from 'gt-next';

export default function SignUpPage() {
  const t = useGT();
  return (
    <AuthCard title={t('Sign up')} description={t('Sign up to your account using your preferred provider')} mode="sign-up" />
  );
}
