import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { serverEnv } from '@/env/server';

const COOKIE_NAME = 'local.session';
const SECRET = serverEnv.LOCAL_AUTH_SECRET || 'insecure-local-secret';
const MAX_AGE_DAYS = parseInt(process.env.LOCAL_SESSION_MAX_AGE_DAYS || '30', 10);

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(data: string) {
  return base64url(crypto.createHmac('sha256', SECRET).update(data).digest());
}

export function createSessionToken(payload: { userId: string; email?: string }) {
  const json = JSON.stringify({ ...payload, iat: Date.now() });
  const body = base64url(json);
  const signature = sign(body);
  return `v1.${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): { userId: string; email?: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [_, body, signature] = parts as [string, string, string];
  const expected = sign(body);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const data = JSON.parse(json);
    if (!data?.userId) return null;
    return { userId: data.userId as string, email: data.email as string | undefined };
  } catch {
    return null;
  }
}

export function getSessionFromHeaders(hdrs: Headers): { userId: string; email?: string } | null {
  const cookieHeader = hdrs.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : null;
  return verifySessionToken(token);
}

export async function getSessionFromRequestCookies(): Promise<{ userId: string; email?: string } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifySessionToken(token || null);
}

export function createCookie(token: string) {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60; // seconds
  const expires = new Date(Date.now() + maxAge * 1000);
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires,
      maxAge,
    },
  };
}

export function clearCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    },
  };
}
