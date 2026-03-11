import { Resend } from 'resend';
import { serverEnv } from '@/env/server';

let resendInstance: Resend | null = null;

/**
 * Get the singleton Resend client instance.
 * Uses lazy initialization to avoid issues during build time.
 */
export function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(serverEnv.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Check if Resend is configured (API key is present).
 */
export function isResendConfigured(): boolean {
  return !!serverEnv.RESEND_API_KEY;
}
