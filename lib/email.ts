import { Resend } from 'resend';
import { serverEnv } from '@/env/server';
import SearchCompletedEmail from '@/components/emails/lookout-completed';

const resend = new Resend(serverEnv.RESEND_API_KEY);

interface SendLookoutCompletionEmailParams {
  to: string;
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
}

export async function sendLookoutCompletionEmail({
  to,
  chatTitle,
  assistantResponse,
  chatId,
}: SendLookoutCompletionEmailParams) {
  try {
    const data = await resend.emails.send({
      from: 'Scira AI <noreply@scira.ai>',
      to: [to],
      subject: `Lookout Complete: ${chatTitle}`,
      react: SearchCompletedEmail({
        chatTitle,
        assistantResponse,
        chatId,
      }),
    });

    console.log('✅ Lookout completion email sent successfully:', data.data?.id);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error('❌ Failed to send lookout completion email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
} 