import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { generateId } from 'ai';
import { userFeedback, feedbackUpdates, feedbackEmailQueue } from '@/lib/db/schema';
import { sendAdminFeedbackNotification, sendFeedbackEmail } from '@/lib/services/feedback-email-service';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const { type, title, description, pageUrl, actionContext } = body;

    if (!type || !title || !description || !pageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (description.length < 10) {
      return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 400 });
    }

    // Generate feedback ID
    const feedbackId = generateId();

    // Insert feedback into database
    const feedback = await db.transaction(async (tx) => {
      // Insert main feedback record
      const [feedbackRecord] = await tx
        .insert(userFeedback)
        .values({
          id: feedbackId,
          userId: session.user.id,
          type,
          title: title.trim(),
          description: description.trim(),
          pageUrl,
          userAgent: body.userAgent || null,
          browserInfo: body.browserInfo || {},
          viewportSize: body.viewportSize || {},
          previousPage: actionContext?.previousPages?.[0]?.url || null,
          sessionDuration: actionContext?.sessionInfo?.totalDuration || null,
          actionContext: actionContext || {},
          screenshotUrl: null,
          status: 'new',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Insert initial status update
      await tx.insert(feedbackUpdates).values({
        id: generateId(),
        feedbackId,
        userId: session.user.id,
        updateType: 'status_change',
        newValue: 'new',
        comment: 'Feedback submitted',
        isInternal: false,
        createdAt: new Date(),
      });

      return feedbackRecord;
    });

    // Send confirmation email immediately
    if (session.user.email) {
      try {
        const emailContent = getEmailContent('submission_confirmation', feedbackId, title);
        await sendFeedbackEmail({
          recipientEmail: session.user.email,
          subject: emailContent.subject,
          bodyHtml: emailContent.bodyHtml,
          bodyText: emailContent.bodyText,
        });
        console.log(`Confirmation email sent to ${session.user.email} for feedback ${feedbackId}`);
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
        // Queue it as fallback
        await queueFeedbackEmail({
          feedbackId,
          recipientEmail: session.user.email,
          emailType: 'submission_confirmation',
          feedbackTitle: title,
        });
      }
    }

    // Send immediate admin notification for critical/high priority items
    if (type === 'bug' || feedback.priority === 'critical' || feedback.priority === 'high') {
      await sendAdminFeedbackNotification(feedbackId);
    }

    return NextResponse.json({
      success: true,
      id: feedbackId,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Helper function to queue feedback emails
async function queueFeedbackEmail(params: {
  feedbackId: string;
  recipientEmail: string;
  emailType: 'submission_confirmation' | 'status_update' | 'admin_notification';
  feedbackTitle: string;
}) {
  const { feedbackId, recipientEmail, emailType, feedbackTitle } = params;

  const emailContent = getEmailContent(emailType, feedbackId, feedbackTitle);

  await db.insert(feedbackEmailQueue).values({
    id: generateId(),
    feedbackId,
    recipientEmail,
    emailType,
    subject: emailContent.subject,
    bodyHtml: emailContent.bodyHtml,
    bodyText: emailContent.bodyText,
    status: 'pending',
    createdAt: new Date(),
  });
}

// Helper function to generate email content
function getEmailContent(type: string, feedbackId: string, feedbackTitle: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scx.ai';

  switch (type) {
    case 'submission_confirmation':
      return {
        subject: `We received your feedback - Ticket #${feedbackId}`,
        bodyHtml: `
          <h2>Thank you for your feedback!</h2>
          <p>We've received your feedback: <strong>${feedbackTitle}</strong></p>
          <p>Your ticket number is: <strong>#${feedbackId}</strong></p>
          <p>We'll review your feedback and update you on any progress. You can expect a response within 24-48 hours.</p>
          <p>Best regards,<br>The SCX.ai Team</p>
        `,
        bodyText: `Thank you for your feedback!\n\nWe've received your feedback: ${feedbackTitle}\nYour ticket number is: #${feedbackId}\n\nWe'll review your feedback and update you on any progress.`,
      };
    default:
      return {
        subject: 'Feedback Update',
        bodyHtml: '<p>Feedback update</p>',
        bodyText: 'Feedback update',
      };
  }
}
