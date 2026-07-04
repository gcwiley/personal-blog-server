import nodemailer from 'nodemailer';

// Creates a nodemailer transport configured from environment variables.
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env (dev)
// or Google Secret Manager (prod).
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // TLS for port 465, STARTTLS for 587
    auth: { user, pass },
  });
}

/**
 * Sends a password reset email to the given address.
 * @param {string} to  - recipient email address
 * @param {string} resetUrl - the full reset-password URL (includes the raw token)
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const transport = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from: `"Personal Blog" <${from}>`,
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset.\n\nClick the link below to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}
