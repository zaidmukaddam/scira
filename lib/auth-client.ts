import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { polarClient } from '@polar-sh/better-auth';
import { dodopaymentsClient } from '@dodopayments/better-auth';

export const betterauthClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [dodopaymentsClient(), organizationClient()],
});

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [organizationClient(), polarClient(), dodopaymentsClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
