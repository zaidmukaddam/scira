import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function AuthGate() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs }).catch(() => null as any);
  const u = (session as any)?.user as any;
  if (!u) {
    return null;
  }
  return null;
}
