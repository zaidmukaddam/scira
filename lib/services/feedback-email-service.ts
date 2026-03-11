import { getResend } from '@/lib/resend';
import { db } from '@/lib/db';
import { feedbackEmailQueue, userFeedback, user } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Use the same verified domain as the monitoring service
const FROM_EMAIL = 'SCX.ai Support <support@scx.ai>';

export async function processFeedbackEmailQueue() {
  try {
    // Get pending emails from queue
    const pendingEmails = await db
      .select()
      .from(feedbackEmailQueue)
      .where(
        and(
          eq(feedbackEmailQueue.status, 'pending'),
          // Retry emails that failed less than 3 times
          eq(feedbackEmailQueue.retryCount, 0),
        ),
      )
      .limit(10); // Process 10 at a time

    for (const email of pendingEmails) {
      try {
        const { data, error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: email.recipientEmail,
          subject: email.subject,
          html: email.bodyHtml,
          text: email.bodyText,
        });

        if (error) {
          throw error;
        }

        // Mark as sent
        await db
          .update(feedbackEmailQueue)
          .set({
            status: 'sent',
            sentAt: new Date(),
          })
          .where(eq(feedbackEmailQueue.id, email.id));

        console.log(`Feedback email sent: ${email.id}`, data);
      } catch (error) {
        console.error(`Failed to send feedback email ${email.id}:`, error);

        // Update retry count and error
        const currentRetryCount = email.retryCount ?? 0;
        await db
          .update(feedbackEmailQueue)
          .set({
            retryCount: currentRetryCount + 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            status: currentRetryCount >= 2 ? 'failed' : 'pending', // Mark as failed after 3 attempts
          })
          .where(eq(feedbackEmailQueue.id, email.id));
      }
    }
  } catch (error) {
    console.error('Error processing feedback email queue:', error);
  }
}

// Send immediate feedback notification to admins
export async function sendAdminFeedbackNotification(feedbackId: string) {
  try {
    // Get feedback details with user info
    const [feedback] = await db
      .select({
        id: userFeedback.id,
        type: userFeedback.type,
        title: userFeedback.title,
        description: userFeedback.description,
        priority: userFeedback.priority,
        pageUrl: userFeedback.pageUrl,
        createdAt: userFeedback.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(userFeedback)
      .leftJoin(user, eq(userFeedback.userId, user.id))
      .where(eq(userFeedback.id, feedbackId))
      .limit(1);

    if (!feedback) {
      console.error('Feedback not found:', feedbackId);
      return;
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const priorityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '📌',
      low: '💭',
    };

    const typeEmoji = {
      bug: '🐛',
      feature: '✨',
      improvement: '💡',
      other: '💬',
    };

    const emoji = priorityEmoji[feedback.priority as keyof typeof priorityEmoji] || '📌';
    const typeEmojiIcon = typeEmoji[feedback.type as keyof typeof typeEmoji] || '💬';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://scx.ai';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .feedback-box { background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .label { font-weight: bold; color: #666; }
    .priority-critical { color: #d32f2f; }
    .priority-high { color: #f57c00; }
    .priority-medium { color: #1976d2; }
    .priority-low { color: #388e3c; }
    .action-button { display: inline-block; background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${emoji} ${typeEmojiIcon} New Feedback Received</h1>
  </div>
  <div class="content">
    <div class="feedback-box">
      <h2>${feedback.title}</h2>
      <p><span class="label">From:</span> ${feedback.userName} (${feedback.userEmail})</p>
      <p><span class="label">Type:</span> ${feedback.type}</p>
      <p><span class="label priority-${feedback.priority}">Priority:</span> ${feedback.priority}</p>
      <p><span class="label">Page:</span> <a href="${feedback.pageUrl}">${feedback.pageUrl}</a></p>
      <p><span class="label">Time:</span> ${new Date(feedback.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
      
      <h3>Description:</h3>
      <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
${feedback.description}
      </div>
    </div>
    
    <a href="${baseUrl}/admin#feedback" class="action-button">
      View in Admin Dashboard
    </a>
    
    <p style="margin-top: 20px; font-size: 14px; color: #666;">
      Ticket ID: #${feedback.id}
    </p>
  </div>
</body>
</html>
    `;

    const text = `
New ${feedback.type} Feedback ${emoji}

Title: ${feedback.title}
From: ${feedback.userName} (${feedback.userEmail})
Type: ${feedback.type}
Priority: ${feedback.priority}
Page: ${feedback.pageUrl}
Time: ${new Date(feedback.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}

Description:
${feedback.description}

View in Admin Dashboard: ${baseUrl}/admin#feedback

Ticket ID: #${feedback.id}
    `;

    // Send to all admin emails
    for (const adminEmail of adminEmails) {
      if (adminEmail) {
        try {
          await getResend().emails.send({
            from: FROM_EMAIL,
            to: adminEmail.trim(),
            subject: `${emoji} New ${feedback.priority} priority ${feedback.type}: ${feedback.title}`,
            html,
            text,
          });
          console.log(`Admin notification sent to ${adminEmail} for feedback ${feedbackId}`);
        } catch (error) {
          console.error(`Failed to send admin notification to ${adminEmail}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error sending admin feedback notification:', error);
  }
}

// Process email queue on a schedule (call this from a cron job or background worker)
export async function runEmailQueueProcessor() {
  await processFeedbackEmailQueue();
}

// Send email immediately (for user confirmations and status updates)
export async function sendFeedbackEmail(params: {
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: params.recipientEmail,
      subject: params.subject,
      html: params.bodyHtml,
      text: params.bodyText,
    });

    if (error) {
      console.error('Failed to send feedback email:', error);
      throw error;
    }

    console.log('Feedback email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending feedback email:', error);
    throw error;
  }
}
