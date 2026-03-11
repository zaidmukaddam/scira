import { NextRequest, NextResponse } from 'next/server';
import { runEmailQueueProcessor } from '@/lib/services/feedback-email-service';

// This endpoint should be called by a cron job to process the email queue
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await runEmailQueueProcessor();

    return NextResponse.json({
      success: true,
      message: 'Email queue processed',
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json({ error: 'Failed to process email queue' }, { status: 500 });
  }
}
