export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { message } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';

function statusFromLatency(avg: number, p95: number, errorRate: number) {
  if (errorRate > 0.1 || p95 > 15_000) return 'down';
  if (errorRate > 0.03 || p95 > 7_000 || avg > 3_000) return 'warn';
  return 'ok';
}

export async function GET(_req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ model: message.model, completionTime: message.completionTime })
    .from(message)
    .where(gte(message.createdAt, since24h));

  const byProvider = new Map<string, number[]>();

  for (const r of rows) {
    const model = (r.model || 'unknown').toString();
    const provider = model.split(':')[0].split('-')[0];
    const ct = Number(r.completionTime || 0);
    if (!byProvider.has(provider)) byProvider.set(provider, []);
    if (!Number.isNaN(ct) && ct > 0) byProvider.get(provider)!.push(ct);
  }

  const providers = Array.from(byProvider.entries()).map(([provider, arr]) => {
    const sorted = arr.slice().sort((a, b) => a - b);
    const avg = sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const errorRate = 0;
    const status = statusFromLatency(avg, p95, errorRate);
    return { provider, avgLatency: Math.round(avg), p95: Math.round(p95), errorRate, status };
  });

  return NextResponse.json({ providers });
}
