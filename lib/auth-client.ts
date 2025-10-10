import { createAuthClient } from 'better-auth/react';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { polarClient } from '@polar-sh/better-auth';

const dodoEnabled = Boolean(process.env.DODO_PAYMENTS_API_KEY);

export const betterauthClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: dodoEnabled ? [dodopaymentsClient()] : [],
});

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [polarClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
