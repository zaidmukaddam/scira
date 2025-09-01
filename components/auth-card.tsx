'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { signIn, signUp, requestOTP, verifyOTP } from '@/lib/auth-client';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AuthCardProps {
  title: string;
  description: string;
  mode?: 'sign-in' | 'sign-up';
}

type AuthStep = 'credentials' | 'otp';

export default function AuthCard({ title, description, mode = 'sign-in' }: AuthCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const router = useRouter();

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'sign-up') {
        await signUp(email, password, name);
        setSuccess('Account created successfully! Please check your email for verification.');
        setTimeout(() => router.push('/sign-in'), 2000);
      } else {
        await signIn(email, password);
        setSuccess('Signed in successfully!');
        setTimeout(() => router.push('/'), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await requestOTP(email);
      setSuccess('OTP sent to your email!');
      setAuthStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await verifyOTP(email, otp);
      setSuccess('OTP verified successfully!');
      setTimeout(() => router.push('/'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetToCredentials = () => {
    setAuthStep('credentials');
    setOtp('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-medium">{title}</h1>
          <p className="text-sm text-muted-foreground/80">{description}</p>
        </div>

        {authStep === 'credentials' ? (
          <div className="space-y-4">
            {/* Password Authentication Form */}
            <form onSubmit={handleCredentialsAuth} className="space-y-4">
              {mode === 'sign-up' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'sign-up' ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  <>{mode === 'sign-up' ? 'Create Account' : 'Sign In'}</>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* OTP Authentication Form */}
            <form onSubmit={handleOTPRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-email" className="text-sm font-medium">
                  Sign in with OTP
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="Enter your email for OTP"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>Send OTP</>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {/* OTP Verification Form */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToCredentials}
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Enter the OTP sent to {email}
              </span>
            </div>

            <form onSubmit={handleOTPVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code" className="text-sm font-medium">
                  Verification Code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify OTP</>
                )}
              </Button>
            </form>

            <Button
              variant="ghost"
              onClick={handleOTPRequest}
              className="w-full text-sm"
              disabled={loading}
            >
              Resend OTP
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {success}
          </div>
        )}

        <div className="pt-6 space-y-4">
          <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="https://famasi.me/legal" className="hover:text-muted-foreground underline-offset-2 underline">
              Terms and Privacy Policy
            </Link>
          </p>

          <p className="text-sm text-center text-muted-foreground">
            {mode === 'sign-in' ? (
              <>
                New to Atlas?{' '}
                <Link href="/sign-up" className="text-foreground font-medium hover:underline underline-offset-4">
                  Create account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/sign-in" className="text-foreground font-medium hover:underline underline-offset-4">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
