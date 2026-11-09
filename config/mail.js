'use strict';
function mailConfig(env = process.env) {
  const user = env.SMTP_USER || 'contact@vistavillaapartments.org';
  const password = env.SMTP_PASSWORD || env.SMTP_PASS;
  const port = Number(env.SMTP_PORT || 587);
  if (!password) throw new Error('Set SMTP_PASSWORD to the custom mailbox password.');
  if (![465,587].includes(port)) throw new Error('SMTP_PORT must be 465 or 587.');
  return {
    transport: {
      host: env.SMTP_HOST || 'mail.privateemail.com', port, secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass: password },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000
    },
    from: { name: 'Vistavilla Apartments', address: user },
    inbox: env.CONTACT_EMAIL || user
  };
}
module.exports = mailConfig;
