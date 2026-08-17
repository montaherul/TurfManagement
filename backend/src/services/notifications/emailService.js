import sgMail from '@sendgrid/mail';
import { env, isSendgridConfigured } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const configured = isSendgridConfigured();
if (configured) {
  sgMail.setApiKey(env.sendgrid.apiKey);
}

/**
 * Sends an email via SendGrid. When SENDGRID_API_KEY is not configured the
 * message is logged to the console instead, so the platform keeps working in
 * local development.
 *
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} [params.text]
 * @param {string} [params.html]
 * @returns {Promise<{ok: boolean, channel: 'sendgrid'|'console'}>}
 */
export const sendEmail = async ({ to, subject, text = '', html = '' }) => {
  if (!configured) {
    logger.info(`[email:console] to=${to} subject="${subject}"`);
    return { ok: true, channel: 'console' };
  }

  try {
    await sgMail.send({
      to,
      from: env.sendgrid.fromEmail,
      subject,
      text,
      html: html || text,
    });
    return { ok: true, channel: 'sendgrid' };
  } catch (err) {
    logger.error(`SendGrid send failed: ${err.message}`);
    return { ok: false, channel: 'sendgrid', error: err.message };
  }
};

export default sendEmail;