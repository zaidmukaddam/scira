import { getResend, isResendConfigured } from '@/lib/resend';
import { HealthCheckResult } from './health-checks';

interface EmailAlertOptions {
  subject: string;
  html: string;
  text: string;
  to: string | string[];
}

/**
 * Send email alert
 */
export async function sendEmailAlert(options: EmailAlertOptions): Promise<boolean> {
  try {
    if (!isResendConfigured()) {
      console.warn('[EMAIL ALERT] RESEND_API_KEY not configured, skipping email');
      return false;
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@scx.ai',
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log('[EMAIL ALERT] Sent successfully to:', recipients);
    return true;
  } catch (error) {
    console.error('[EMAIL ALERT] Failed to send:', error);
    return false;
  }
}

/**
 * Send health check summary email
 */
export async function sendHealthCheckSummary(results: HealthCheckResult[], recipientEmail: string): Promise<boolean> {
  const healthyCount = results.filter((r) => r.status === 'healthy').length;
  const degradedCount = results.filter((r) => r.status === 'degraded').length;
  const unhealthyCount = results.filter((r) => r.status === 'unhealthy').length;
  const total = results.length;

  const overallStatus = unhealthyCount > 0 ? 'UNHEALTHY' : degradedCount > 0 ? 'DEGRADED' : 'HEALTHY';

  const html = `
    <h2>Health Check Summary - ${overallStatus}</h2>
    <p><strong>Total Services:</strong> ${total}</p>
    <p><strong>Healthy:</strong> ${healthyCount} | <strong>Degraded:</strong> ${degradedCount} | <strong>Unhealthy:</strong> ${unhealthyCount}</p>
    
    <h3>Service Status</h3>
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Service</th>
        <th>Category</th>
        <th>Status</th>
        <th>Response Time (ms)</th>
        <th>Error</th>
      </tr>
      ${results
        .map(
          (r) => `
        <tr>
          <td>${r.service}</td>
          <td>${r.category}</td>
          <td>${r.status}</td>
          <td>${r.responseTime}</td>
          <td>${r.error || '-'}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
    
    <p><small>Generated at ${new Date().toISOString()}</small></p>
  `;

  const text = `
Health Check Summary - ${overallStatus}

Total Services: ${total}
Healthy: ${healthyCount} | Degraded: ${degradedCount} | Unhealthy: ${unhealthyCount}

Service Status:
${results.map((r) => `${r.service} (${r.category}): ${r.status} - ${r.responseTime}ms${r.error ? ` - ${r.error}` : ''}`).join('\n')}

Generated at ${new Date().toISOString()}
  `;

  return sendEmailAlert({
    subject: `Health Check: ${overallStatus} - ${unhealthyCount} Unhealthy Service(s)`,
    html,
    text,
    to: recipientEmail,
  });
}

/**
 * Send alert for unhealthy services only
 */
export async function sendUnhealthyServiceAlert(
  results: HealthCheckResult[],
  recipientEmail: string,
): Promise<boolean> {
  const unhealthy = results.filter((r) => r.status === 'unhealthy');
  const degraded = results.filter((r) => r.status === 'degraded');

  if (unhealthy.length === 0 && degraded.length === 0) {
    // All services healthy, no alert needed
    return true;
  }

  const html = `
    <h2>⚠️ Service Health Alert</h2>
    
    ${
      unhealthy.length > 0
        ? `
      <h3>Unhealthy Services (${unhealthy.length})</h3>
      <ul>
        ${unhealthy.map((r) => `<li><strong>${r.service}</strong> (${r.category}): ${r.error || 'Unknown error'}</li>`).join('')}
      </ul>
    `
        : ''
    }
    
    ${
      degraded.length > 0
        ? `
      <h3>Degraded Services (${degraded.length})</h3>
      <ul>
        ${degraded.map((r) => `<li><strong>${r.service}</strong> (${r.category}): ${r.error || 'Performance issue'}</li>`).join('')}
      </ul>
    `
        : ''
    }
    
    <p><small>Generated at ${new Date().toISOString()}</small></p>
  `;

  const text = `
Service Health Alert

${unhealthy.length > 0 ? `Unhealthy Services (${unhealthy.length}):\n${unhealthy.map((r) => `- ${r.service} (${r.category}): ${r.error || 'Unknown error'}`).join('\n')}\n` : ''}
${degraded.length > 0 ? `Degraded Services (${degraded.length}):\n${degraded.map((r) => `- ${r.service} (${r.category}): ${r.error || 'Performance issue'}`).join('\n')}\n` : ''}

Generated at ${new Date().toISOString()}
  `;

  return sendEmailAlert({
    subject: `⚠️ Service Alert: ${unhealthy.length} Unhealthy, ${degraded.length} Degraded`,
    html,
    text,
    to: recipientEmail,
  });
}
