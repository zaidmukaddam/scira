"use client"

import AuthCard from "@/components/auth-card"
import { useTranslation } from 'react-i18next';

export default function SignInPage() {
    const { t } = useTranslation();
    return (
        <AuthCard title={t('sign_in_title')} description="Sign in to your account using your preferred provider" mode="sign-in" />
    )
}