import { sendEmail } from './emailSender.js';

// Simple in-memory queue for failed emails
const emailQueue = [];
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Send email with automatic retry on failure
 * @param {Object} mailOptions - Email configuration
 * @param {number} attempt - Current attempt number
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export async function sendEmailWithRetry(mailOptions, attempt = 1) {
  try {
    console.log(`[Email] Sending email attempt ${attempt}/${MAX_RETRIES}...`);
    const result = await sendEmail(mailOptions);
    console.log(`[Email] ✅ Email sent successfully to ${mailOptions.to} via ${result.provider}`);
    return true;
  } catch (error) {
    console.error(`[Email] ❌ Attempt ${attempt} failed:`, error.message);
    
    if (attempt < MAX_RETRIES) {
      console.log(`[Email] Retrying in ${RETRY_DELAY}ms...`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return sendEmailWithRetry(mailOptions, attempt + 1);
    } else {
      console.error(`[Email] ❌ Failed to send email after ${MAX_RETRIES} attempts`);
      // Queue for later processing
      emailQueue.push({
        mailOptions,
        failedAt: new Date(),
        attempts: attempt
      });
      return false;
    }
  }
}

/**
 * Get pending emails in queue
 */
export function getPendingEmails() {
  return emailQueue;
}

/**
 * Process pending email queue
 */
export async function processPendingEmails() {
  if (emailQueue.length === 0) {
    console.log('[Email Queue] No pending emails');
    return;
  }

  console.log(`[Email Queue] Processing ${emailQueue.length} pending email(s)...`);
  
  const processed = [];
  for (let i = 0; i < emailQueue.length; i++) {
    const email = emailQueue[i];
    const success = await sendEmailWithRetry(email.mailOptions);
    if (success) {
      processed.push(i);
    }
  }

  // Remove successfully sent emails from queue
  for (let i = processed.length - 1; i >= 0; i--) {
    emailQueue.splice(processed[i], 1);
  }

  console.log(`[Email Queue] Processed: ${processed.length}/${emailQueue.length} emails sent`);
}

/**
 * Clear the email queue (for debugging)
 */
export function clearEmailQueue() {
  emailQueue.length = 0;
  console.log('[Email Queue] Queue cleared');
}

export default {
  sendEmailWithRetry,
  getPendingEmails,
  processPendingEmails,
  clearEmailQueue
};
