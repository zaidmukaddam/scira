'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { signIn } from '@/lib/auth-client';
import { Loader2 } from 'lucide-react';

import Link from 'next/link';

interface SignInPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SignInButtonProps {
  provider: 'github' | 'google' | 'twitter';
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SignInButton = ({ provider, loading, setLoading }: SignInButtonProps) => {
  const isGithub = provider === 'github';
  const isGoogle = provider === 'google';
  const isTwitter = provider === 'twitter';

  return (
    <Button
      variant="outline"
      className="relative w-full h-10 px-4 font-normal text-sm"
      disabled={loading}
      onClick={async () => {
        await signIn.social(
          {
            provider,
            callbackURL: '/',
          },
          {
            onRequest: () => {
              setLoading(true);
            },
          },
        );
      }}
    >
      <div className="flex items-center justify-center w-full gap-3">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {isGithub && (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {isGoogle && (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isTwitter && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            )}
            <span>Continue with {isGithub ? 'GitHub' : isGoogle ? 'Google' : 'X (Twitter)'}</span>
          </>
        )}
      </div>
    </Button>
  );
};

export function SignInPromptDialog({ open, onOpenChange }: SignInPromptDialogProps) {
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-6 gap-0">
        {/* Compact Header */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-foreground mb-1">Sign in to continue</h2>
          <p className="text-sm text-muted-foreground">Save conversations and sync across devices</p>
        </div>

        {/* Auth Options */}
        <div className="space-y-2 mb-4">
          <SignInButton provider="github" loading={githubLoading} setLoading={setGithubLoading} />
          <SignInButton provider="google" loading={googleLoading} setLoading={setGoogleLoading} />
          <SignInButton provider="twitter" loading={twitterLoading} setLoading={setTwitterLoading} />
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted-foreground">or</span>
          </div>
        </div>

        {/* Guest Option */}
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="w-full h-10 font-normal text-sm"
        >
          Continue without account
        </Button>

        {/* Legal */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          By continuing, you accept our{' '}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms
          </Link>
          {' & '}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
