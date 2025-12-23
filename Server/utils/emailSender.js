import transporter from '../config/nodemailer.js';

// Prefer SendGrid Web API in hosted environments to avoid SMTP egress issues
let sgMail = null;
let SENDGRID_API_KEY = null;
const SENDGRID_VERIFIED_FROM = process.env.SENDGRID_VERIFIED_FROM || '';

const SMTP_HOST = String(process.env.SMTP_HOST || '').toLowerCase();
const SMTP_USER = String(process.env.SMTP_USER || '').toLowerCase();

const SMTP_IS_SENDGRID = SMTP_HOST.includes('sendgrid') || SMTP_USER === 'apikey';
if (SMTP_IS_SENDGRID) {
  try {
    // Lazy import to avoid dependency issues if not installed
    const mod = await import('@sendgrid/mail');
    sgMail = mod.default || mod;
    // Use explicit SENDGRID_API_KEY if provided, else fall back to SMTP_PASS when SMTP_USER=apikey
    SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.SMTP_PASS || '';
    if (SENDGRID_API_KEY) {
      sgMail.setApiKey(SENDGRID_API_KEY);
    }
  } catch (err) {
    console.warn('[EmailSender] SendGrid module not available, will use SMTP transporter', err.message);
  }
}

/**
 * Send email using SendGrid API when available, else fallback to SMTP via nodemailer
 * @param {{from:string, replyTo?:string, to:string|string[], subject:string, html:string, text?:string}} mailOptions
 */
function parseFrom(fromValue) {
  if (!fromValue) return { email: '', name: '' };
  if (typeof fromValue === 'object' && fromValue.email) {
    return { email: fromValue.email, name: fromValue.name || '' };
  }
  const str = String(fromValue);
  const match = str.match(/^(.*)<\s*([^>]+)\s*>\s*$/);
  if (match) {
    const name = match[1].trim().replace(/"/g, '');
    const email = match[2].trim();
    return { email, name };
  }
  // fallback: if it looks like an email
  if (str.includes('@')) return { email: str.trim(), name: '' };
  // last resort use SENDER_EMAIL
  const fallbackEmail = process.env.SENDER_EMAIL || '';
  return { email: fallbackEmail, name: str.trim() };
}

export async function sendEmail(mailOptions) {
  const { email: parsedEmail, name: parsedName } = parseFrom(mailOptions.from);
  const to = mailOptions.to;
  const replyTo = mailOptions.replyTo;
  const subject = mailOptions.subject;
  const html = mailOptions.html;
  const text = mailOptions.text || '';

  // Prefer SendGrid API if configured
  if (sgMail && SENDGRID_API_KEY) {
    try {
      const fromEmail = SENDGRID_VERIFIED_FROM || parsedEmail;
      const payload = {
        to,
        from: { email: fromEmail, name: parsedName || (process.env.SENDER_NAME || '') },
        subject,
        html,
        text,
        replyTo,
        categories: ['transactional', 'otp'],
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
          openTracking: { enable: false },
          subscriptionTracking: { enable: false }
        },
        mailSettings: {
          bypassListManagement: { enable: true },
          bypassSpamManagement: { enable: true }
        }
      };
      await sgMail.send(payload);
      return { provider: 'sendgrid', ok: true };
    } catch (apiErr) {
      console.error('[EmailSender] SendGrid API send failed:', apiErr?.response?.body || apiErr.message);
      // Fallback to SMTP if API fails
    }
  }

  // Fallback to SMTP
  await transporter.sendMail(mailOptions);
  return { provider: 'smtp', ok: true };
}

export default { sendEmail };