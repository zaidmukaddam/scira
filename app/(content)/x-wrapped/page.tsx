'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { XLogoIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ChevronRight } from 'lucide-react';
import { ColorPanels } from '@paper-design/shaders-react';

export default function XWrappedPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = () => {
    const cleanUsername = username.trim().replace(/^@+/, '');

    if (!cleanUsername) {
      setError('Please enter a username');
      return;
    }

    setError('');
    setLoading(true);
    // Navigate to the username route
    router.push(`/x-wrapped/${encodeURIComponent(cleanUsername)}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
      {/* Shader Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <ColorPanels
          style={{ width: '100%', height: '100%' }}
          colors={['#786654', '#f5e6c8', '#d95545', '#c9a87c']}
          colorBack="#00000000"
          density={1.6}
          angle1={0.3}
          angle2={0.3}
          length={1}
          edges
          blur={0.25}
          fadeIn={0.85}
          fadeOut={0.3}
          gradient={0}
          speed={0.6}
          rotation={112}
        />
        {/* Overlay to improve text readability */}
        <div className="absolute inset-0 bg-background/20" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-10">
        {/* Logo + Title */}
        <div className="space-y-4 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center justify-center gap-2">
              <XLogoIcon className="size-12" />
              <span className="font-be-vietnam-pro text-4xl tracking-tighter">Wrapped</span>
            </h1>
            <p className="mt-1 text-base text-foreground">Your 2025 on X, analyzed by AI</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-6">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                type="text"
                placeholder="handle"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s+/g, '');
                  setUsername(value);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={loading}
                className="pl-8"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading || !username.trim()} className="w-full gap-2" size="lg">
            {loading ? (
              <>
                <Spinner className="size-4" />
                Redirecting…
              </>
            ) : (
              <>
                Generate
                <ChevronRight className="size-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-foreground">
          Analysis takes ~2 minutes · Profiles must be public
          <br />
          Powered by{' '}
          <a href="https://x.ai/api" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
            Grok
          </a>{' '}
          · Results cached for 5 minutes
        </p>
      </motion.div>
    </div>
  );
}
