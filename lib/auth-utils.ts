import { auth } from '@/lib/auth';
import { config } from 'dotenv';
import { headers } from 'next/headers';
import { cache } from 'react';
import { User } from './db/schema';

config({
  path: '.env.local',
});

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  return auth.api.getSession({
    headers: requestHeaders,
  });
});

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user as User | null;
};
