import { Resend } from 'resend';
import { serverEnv } from '@/env/server';
import SearchCompletedEmail from '@/components/emails/lookout-completed';

const resend = new Resend(serverEnv.RESEND_API_KEY);
const canSendEmails = !!serverEnv.RESEND_API_KEY && serverEnv.RESEND_API_KEY !== 'placeholder';

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
  if (!canSendEmails) {
    console.warn('📬 RESEND_API_KEY não configurada - pulando envio de e-mail de lookout.');
    return { success: false, error: 'Email delivery disabled' };
  }

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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface SendAuthEmailParams {
  to: string;
  url: string;
  token: string;
  userName?: string | null;
}

export async function sendMagicLinkEmail({ to, url, token, userName }: SendAuthEmailParams) {
  if (!canSendEmails) {
    console.warn('📬 RESEND_API_KEY não configurada - pulando envio de magic link.');
    return;
  }

  try {
    const { data } = await resend.emails.send({
      from: 'Scira AI <noreply@scira.ai>',
      to: [to],
      subject: 'Your Scira AI sign-in link',
      html: `
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Use o link abaixo para entrar rapidamente no Scira AI:</p>
        <p><a href="${url}">Acessar o Scira AI</a></p>
        <p>O link expira em poucos minutos. Se você não solicitou este acesso, ignore este e-mail.</p>
        <p>Token: ${token}</p>
      `,
      text: [
        `Olá${userName ? ` ${userName}` : ''},`,
        'Use o link abaixo para entrar rapidamente no Scira AI:',
        url,
        'O link expira em poucos minutos. Se você não solicitou este acesso, ignore este e-mail.',
        `Token: ${token}`,
      ].join('\n\n'),
    });

    console.log('📨 Magic link email enviado:', data?.id);
  } catch (error) {
    console.error('⚠️ Falha ao enviar magic link:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail({ to, url, token, userName }: SendAuthEmailParams) {
  if (!canSendEmails) {
    console.warn('📬 RESEND_API_KEY não configurada - pulando envio de reset de senha.');
    return;
  }
  try {
    const { data } = await resend.emails.send({
      from: 'Scira AI <noreply@scira.ai>',
      to: [to],
      subject: 'Redefina sua senha do Scira AI',
      html: `
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Recebemos um pedido para redefinir sua senha.</p>
        <p><a href="${url}">Clique aqui para redefinir sua senha</a></p>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
        <p>Token: ${token}</p>
      `,
      text: [
        `Olá${userName ? ` ${userName}` : ''},`,
        'Recebemos um pedido para redefinir sua senha.',
        url,
        'Se você não solicitou essa alteração, ignore este e-mail.',
        `Token: ${token}`,
      ].join('\n\n'),
    });

    console.log('📨 E-mail de reset de senha enviado:', data?.id);
  } catch (error) {
    console.error('⚠️ Falha ao enviar e-mail de reset de senha:', error);
    throw error;
  }
}

export async function sendVerificationEmail({ to, url, token, userName }: SendAuthEmailParams) {
  if (!canSendEmails) {
    return;
  }
  try {
    const { data } = await resend.emails.send({
      from: 'Scira AI <noreply@scira.ai>',
      to: [to],
      subject: 'Verifique seu e-mail no Scira AI',
      html: `
        <p>Olá${userName ? ` ${userName}` : ''},</p>
        <p>Confirme seu endereço de e-mail para concluir a criação da sua conta no Scira AI.</p>
        <p><a href="${url}">Verificar e-mail</a></p>
        <p>Se você não iniciou este cadastro, ignore este e-mail.</p>
        <p>Token: ${token}</p>
      `,
      text: [
        `Olá${userName ? ` ${userName}` : ''},`,
        'Confirme seu endereço de e-mail para concluir a criação da sua conta no Scira AI.',
        url,
        'Se você não iniciou este cadastro, ignore este e-mail.',
        `Token: ${token}`,
      ].join('\n\n'),
    });

    console.log('📨 E-mail de verificação enviado:', data?.id);
  } catch (error) {
    console.error('⚠️ Falha ao enviar e-mail de verificação:', error);
    throw error;
  }
}
