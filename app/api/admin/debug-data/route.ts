export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { user, message, chat, event } from '@/lib/db/schema';
import { gte } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET() {
  const hdrs = await headers();
  
  try {
    // Tester la session
    const session = await auth.api.getSession({ headers: hdrs });
    const sessionUser = (session as any)?.user;

    // Compter les données
    const allUsers = await db.select().from(user);
    const allChats = await db.select().from(chat);
    const allMessages = await db.select().from(message);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await db
      .select()
      .from(message)
      .where(gte(message.createdAt, since24h));
    const allEvents = await db.select().from(event);

    return NextResponse.json({
      auth: {
        authenticated: !!sessionUser,
        userId: sessionUser?.id || null,
        role: sessionUser?.role || null,
        status: sessionUser?.status || null,
        isAdmin: sessionUser?.role === 'admin' && sessionUser?.status !== 'suspended' && sessionUser?.status !== 'deleted',
      },
      data: {
        totalUsers: allUsers.length,
        totalChats: allChats.length,
        totalMessages: allMessages.length,
        recentMessages24h: recentMessages.length,
        totalEvents: allEvents.length,
        admins: allUsers.filter((u: any) => u.role === 'admin').map((u: any) => ({ id: u.id, name: u.name, status: u.status })),
        sampleUsers: allUsers.slice(0, 3).map((u: any) => ({ id: u.id, name: u.name, role: u.role, status: u.status })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
