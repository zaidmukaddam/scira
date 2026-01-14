'use client';

import { useState } from 'react';
import { authClient, signIn } from '@/lib/auth-client';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AuthProvider = 'google';

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
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Email/Password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const lastMethod = authClient.getLastUsedLoginMethod();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation for sign-up
    if (mode === 'sign-up') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setEmailLoading(true);

    try {
      await signIn.email({
        email,
        password,
        callbackURL: '/',
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

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

      {/* Email/Password Form */}
      <form onSubmit={handleEmailAuth} className="space-y-5 mb-6">
        {error && (
          <div className="p-3.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-12 pl-11 pr-4 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full h-12 pl-11 pr-12 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {mode === 'sign-up' && (
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full h-12 pl-11 pr-12 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={emailLoading}
          className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {emailLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{mode === 'sign-up' ? 'Creating account...' : 'Signing in...'}</span>
            </>
          ) : (
            <span>{mode === 'sign-up' ? 'Create account' : 'Sign in'}</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* Google Auth Button */}
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
