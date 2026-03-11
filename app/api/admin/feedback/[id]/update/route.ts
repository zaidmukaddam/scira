import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { generateId } from 'ai';
import { userFeedback, feedbackUpdates, feedbackEmailQueue, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendFeedbackEmail } from '@/lib/services/feedback-email-service';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params as required in Next.js 15
    const { id: feedbackId } = await params;

    // Check if user is authenticated and is admin
    const session = await getSession();

    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates, comment } = body;

    // Get current feedback state
    const [currentFeedback] = await db.select().from(userFeedback).where(eq(userFeedback.id, feedbackId)).limit(1);

    if (!currentFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Perform updates in transaction
    await db.transaction(async (tx) => {
      // Track what changed for update history
      const updateRecords = [];

      // Update status if changed
      if (updates.status && updates.status !== currentFeedback.status) {
        updateRecords.push({
          id: generateId(),
          feedbackId,
          userId: session.user.id,
          updateType: 'status_change',
          oldValue: currentFeedback.status,
          newValue: updates.status,
          comment,
          isInternal: false,
          createdAt: new Date(),
        });

        // If resolved, set resolved metadata
        if (updates.status === 'resolved') {
          updates.resolvedBy = session.user.id;
          updates.resolvedAt = new Date();
        }
      }

      // Update priority if changed
      if (updates.priority && updates.priority !== currentFeedback.priority) {
        updateRecords.push({
          id: generateId(),
          feedbackId,
          userId: session.user.id,
          updateType: 'priority_change',
          oldValue: currentFeedback.priority,
          newValue: updates.priority,
          comment: comment || null,
          isInternal: false,
          createdAt: new Date(),
        });
      }

      // Update category if changed
      if ('categoryId' in updates && updates.categoryId !== currentFeedback.categoryId) {
        updateRecords.push({
          id: generateId(),
          feedbackId,
          userId: session.user.id,
          updateType: 'category_change',
          oldValue: currentFeedback.categoryId,
          newValue: updates.categoryId,
          comment: comment || null,
          isInternal: false,
          createdAt: new Date(),
        });
      }

      // Add comment if provided without other changes
      if (comment && updateRecords.length === 0) {
        updateRecords.push({
          id: generateId(),
          feedbackId,
          userId: session.user.id,
          updateType: 'comment',
          comment,
          isInternal: false,
          createdAt: new Date(),
        });
      }

      // Update the feedback record
      if (Object.keys(updates).length > 0) {
        await tx
          .update(userFeedback)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(userFeedback.id, feedbackId));
      }

      // Insert update records
      if (updateRecords.length > 0) {
        await tx.insert(feedbackUpdates).values(updateRecords);
      }

      // Queue email notification if status changed
      if (updates.status && updates.status !== currentFeedback.status) {
        // Get user email
        const [feedbackUser] = await tx
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, currentFeedback.userId))
          .limit(1);

        if (feedbackUser?.email) {
          const emailContent = getStatusUpdateEmailContent(
            feedbackId,
            currentFeedback.title,
            currentFeedback.status,
            updates.status,
            comment,
          );

          // Try to send email immediately
          try {
            await sendFeedbackEmail({
              recipientEmail: feedbackUser.email,
              subject: emailContent.subject,
              bodyHtml: emailContent.bodyHtml,
              bodyText: emailContent.bodyText,
            });
            console.log(`Status update email sent to ${feedbackUser.email} for feedback ${feedbackId}`);
          } catch (error) {
            console.error('Failed to send status update email immediately, queueing:', error);
            // Fall back to queue if immediate sending fails
            await tx.insert(feedbackEmailQueue).values({
              id: generateId(),
              feedbackId,
              recipientEmail: feedbackUser.email,
              emailType: 'status_update',
              subject: emailContent.subject,
              bodyHtml: emailContent.bodyHtml,
              bodyText: emailContent.bodyText,
              status: 'pending',
              createdAt: new Date(),
            });
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback updated successfully',
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

function getStatusUpdateEmailContent(
  feedbackId: string,
  title: string,
  oldStatus: string,
  newStatus: string,
  comment?: string,
) {
  const statusMessages = {
    in_review: 'is now being reviewed by our team',
    in_progress: 'is now being worked on',
    resolved: 'has been resolved',
    closed: 'has been closed',
    wont_fix: 'will not be implemented at this time',
  };

  const message = statusMessages[newStatus as keyof typeof statusMessages] || 'has been updated';

  return {
    subject: `Update on your feedback - Ticket #${feedbackId}`,
    bodyHtml: `
      <h2>Your feedback has been updated</h2>
      <p>Your feedback ticket "<strong>${title}</strong>" ${message}.</p>
      <p><strong>Previous status:</strong> ${oldStatus.replace('_', ' ')}</p>
      <p><strong>New status:</strong> ${newStatus.replace('_', ' ')}</p>
      ${comment ? `<p><strong>Admin comment:</strong> ${comment}</p>` : ''}
      <p>Thank you for helping us improve SCX.ai!</p>
      <p>Best regards,<br>The SCX.ai Team</p>
    `,
    bodyText: `Your feedback has been updated\n\nYour feedback ticket "${title}" ${message}.\n\nPrevious status: ${oldStatus.replace('_', ' ')}\nNew status: ${newStatus.replace('_', ' ')}\n${comment ? `\nAdmin comment: ${comment}` : ''}\n\nThank you for helping us improve SCX.ai!`,
  };
}
