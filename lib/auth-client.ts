import { createAuthClient } from 'better-auth/react';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { polarClient } from '@polar-sh/better-auth';

export const betterauthClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8931',
  plugins: [dodopaymentsClient()],
});

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8931',
  plugins: [polarClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
