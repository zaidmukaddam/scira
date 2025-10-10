import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // TODO: Wire to Supabase Postgres (users table) and verify password hash.
    // For now, return 501 to indicate configuration required.
    return NextResponse.json({ error: 'Local auth not configured' }, { status: 501 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
