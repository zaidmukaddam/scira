import { NextResponse } from 'next/server';
import { clearCookie } from '@/lib/local-session';

export async function POST() {
  const res = NextResponse.json({ success: true });
  const cookie = clearCookie();
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
