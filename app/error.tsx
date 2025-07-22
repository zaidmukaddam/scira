'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col font-sans items-center justify-center min-h-screen bg-background text-foreground p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="mb-6 flex justify-center">
          <Image
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzE2YzFlNWExYTJjZjkxZDUxOWQ1MmU2ZjA1NjYxNWIzYzVmMWQ5MSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/aYpmlCXgX9dc09dbpl/giphy.gif"
            alt="Computer Error"
            width={300}
            height={200}
            className="rounded-lg"
            unoptimized
          />
        </div>

        <h1 className="text-4xl mb-4 text-neutral-800 dark:text-neutral-100 font-be-vietnam-pro">
          Something went wrong
        </h1>
        <p className="text-lg mb-8 text-neutral-600 dark:text-neutral-300">
          An error occurred while trying to load this page. Please try again later.
        </p>

        <div className="flex justify-center gap-4">
          <Button variant="default" className="flex items-center gap-2 px-4 py-2 rounded-full" onClick={reset}>
            <RefreshCw size={18} />
            <span>Try again</span>
          </Button>

          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2 px-4 py-2 rounded-full">
              <ArrowLeft size={18} />
              <span>Return to home</span>
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
