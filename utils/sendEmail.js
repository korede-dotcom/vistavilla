'use strict';
const nodemailer = require('nodemailer');
const mailConfig = require('../config/mail');

// Every system email authenticates and sends from the same custom mailbox.
const SendEmail = async (subject, text, html, to, options = {}) => {
  const config = mailConfig();
  if (!to) throw new Error('Email recipient is required.');
  const transporter = nodemailer.createTransport(config.transport);
  try {
    return await transporter.sendMail({
      from: config.from, to, subject, text, html,
      ...(options && typeof options === 'object' && options.replyTo ? { replyTo: options.replyTo } : {})
    });
  } catch (error) {
    if (error.code === 'EAUTH') {
      throw new Error('Custom mailbox authentication failed. Check SMTP_USER and SMTP_PASSWORD on the server.', { cause: error });
    }
    throw error;
  } finally {
    transporter.close();
  }
};
module.exports = SendEmail;
