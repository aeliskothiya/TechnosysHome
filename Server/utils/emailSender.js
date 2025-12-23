import transporter from '../config/nodemailer.js';

// Prefer SendGrid Web API in hosted environments to avoid SMTP egress issues
let sgMail = null;
let SENDGRID_API_KEY = null;

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
export async function sendEmail(mailOptions) {
  // Normalize payload
  const payload = {
    to: mailOptions.to,
    from: mailOptions.from,
    subject: mailOptions.subject,
    html: mailOptions.html,
    replyTo: mailOptions.replyTo,
  };

  // Prefer SendGrid API if configured
  if (sgMail && SENDGRID_API_KEY) {
    try {
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