'use client';

import { useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

type AuthProvider = 'google' | 'github';

interface AuthIconProps extends React.ComponentProps<'svg'> {}

const AuthIcons = {
  Google: (props: AuthIconProps) => (
    <svg viewBox="0 0 256 262" preserveAspectRatio="xMidYMid" {...props}>
      <path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </svg>
  ),
  GitHub: (props: AuthIconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
};

interface SignInButtonProps {
  title: string;
  provider: AuthProvider;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  callbackURL: string;
  icon: React.ReactNode;
  isLastUsed?: boolean;
}

interface AuthCardProps {
  title: string;
  description: string;
  mode?: 'sign-in' | 'sign-up';
}

const SignInButton = ({ title, provider, loading, setLoading, callbackURL, icon, isLastUsed }: SignInButtonProps) => {
  return (
    <button
      className={
        `relative w-full h-12 text-sm
        bg-background
        border border-border rounded-lg
        hover:bg-muted/50 hover:border-foreground/20
        active:scale-[0.99]
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-3
        group
        ${isLastUsed ? 'ring-2 ring-primary/20' : ''}
      `}
      disabled={loading}
      onClick={async () => {
        await signIn.social(
          {
            provider,
            callbackURL,
          },
          {
            onRequest: () => {
              setLoading(true);
            },
          },
        );
      }}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      </div>
      <span className="font-medium text-foreground/90 group-hover:text-foreground transition-colors">
        {title}
      </span>
      {isLastUsed && (
        <span className="absolute right-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          Last used
        </span>
      )}
    </button>
  );
};

export default function AuthCard({ title, description, mode = 'sign-in' }: AuthCardProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const lastMethod = authClient.getLastUsedLoginMethod();

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <SignInButton
          title="Continue with Google"
          provider="google"
          loading={googleLoading}
          setLoading={setGoogleLoading}
          callbackURL="/"
          icon={<AuthIcons.Google className="w-5 h-5" />}
          isLastUsed={lastMethod === 'google'}
        />
        
        <SignInButton
          title="Continue with GitHub"
          provider="github"
          loading={githubLoading}
          setLoading={setGithubLoading}
          callbackURL="/"
          icon={<AuthIcons.GitHub className="w-5 h-5" />}
          isLastUsed={lastMethod === 'github'}
        />
      </div>

      {/* Switch Auth Mode */}
      <div className="mt-8 text-center">
        <span className="text-sm text-muted-foreground">
          {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
        </span>
        <Link
          href={mode === 'sign-in' ? '/sign-up' : '/sign-in'}
          className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
        >
          {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
        </Link>
      </div>

      {/* Legal */}
      <p className="mt-8 text-[11px] text-center text-muted-foreground leading-relaxed">
        By continuing, you agree to HebronAI's{' '}
        <Link
          href="/terms"
          className="text-foreground/70 hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          Terms
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy-policy"
          className="text-foreground/70 hover:text-foreground underline-offset-2 hover:underline transition-colors"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
