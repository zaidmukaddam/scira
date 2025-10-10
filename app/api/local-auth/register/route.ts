import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Registration disabled' }, { status: 410 });
}
