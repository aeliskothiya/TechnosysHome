import nodemailer from 'nodemailer'

// Configurable SMTP transport (Brevo defaults)
const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);
const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

// Create a reusable transporter object using SMTP
// Add sensible defaults for cloud environments to reduce connection issues
const transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587/STARTTLS
    requireTLS: !secure,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
});

export default transporter;