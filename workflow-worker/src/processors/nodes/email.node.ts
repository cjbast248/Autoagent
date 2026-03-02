/**
 * Email Node - Send emails via various providers
 */

interface EmailConfig {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyType?: 'text' | 'html';
  from?: string;
  replyTo?: string;
  provider?: 'resend' | 'smtp' | 'sendgrid';
  // SMTP settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
}

/**
 * Execute Email Node
 * Sends email using configured provider
 */
export async function executeEmailNode(
  config: EmailConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[Email] Preparing to send email...');

  const to = resolveValue(config.to, inputData);
  const subject = resolveValue(config.subject, inputData) || 'No Subject';
  const body = resolveValue(config.body, inputData) || '';
  const from = config.from || process.env.EMAIL_FROM || 'noreply@kallina.info';
  const provider = config.provider || 'resend';

  if (!to) {
    throw new Error('Email: Recipient (to) is required');
  }

  console.log(`[Email] Sending to: ${to}, Subject: ${subject}`);

  // Use Resend API (default provider)
  if (provider === 'resend') {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('Email: RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: to.split(',').map((e: string) => e.trim()),
        cc: config.cc ? config.cc.split(',').map((e: string) => e.trim()) : undefined,
        bcc: config.bcc ? config.bcc.split(',').map((e: string) => e.trim()) : undefined,
        subject,
        ...(config.bodyType === 'html' ? { html: body } : { text: body }),
        reply_to: config.replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email send failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as { id?: string };
    console.log('[Email] Email sent successfully via Resend');

    return {
      ...inputData,
      email_sent: true,
      email_id: result.id || 'unknown',
      email_to: to,
      email_subject: subject,
    };
  }

  // SendGrid
  if (provider === 'sendgrid') {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      throw new Error('Email: SENDGRID_API_KEY not configured');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: to.split(',').map((email: string) => ({ email: email.trim() })),
          cc: config.cc ? config.cc.split(',').map((email: string) => ({ email: email.trim() })) : undefined,
          bcc: config.bcc ? config.bcc.split(',').map((email: string) => ({ email: email.trim() })) : undefined,
        }],
        from: { email: from },
        subject,
        content: [{
          type: config.bodyType === 'html' ? 'text/html' : 'text/plain',
          value: body,
        }],
        reply_to: config.replyTo ? { email: config.replyTo } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email send failed: ${response.status} - ${errorText}`);
    }

    console.log('[Email] Email sent successfully via SendGrid');

    return {
      ...inputData,
      email_sent: true,
      email_to: to,
      email_subject: subject,
    };
  }

  throw new Error(`Email: Provider '${provider}' not supported. Use 'resend' or 'sendgrid'.`);
}

/**
 * Resolve a value that might contain template expressions
 */
function resolveValue(value: string | undefined, data: Record<string, unknown>): string {
  if (!value) return '';

  // Simple template resolution for {{field}} patterns
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) return match;
      if (typeof current !== 'object') return match;

      // Handle $json prefix
      if (part === '$json') continue;

      current = (current as Record<string, unknown>)[part];
    }

    return current !== undefined && current !== null ? String(current) : match;
  });
}
