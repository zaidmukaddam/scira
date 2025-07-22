import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { polarClient } from '@polar-sh/better-auth';

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000',
  plugins: [organizationClient(), polarClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
