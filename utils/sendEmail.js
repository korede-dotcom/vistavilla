const nodemailer = require('nodemailer');

const SendEmail = async (subject, text, html, to) => {
    const transporter = nodemailer.createTransport({
        host: "mail.privateemail.com",
        port: 587,
        secure: false, // true for 465, false for 587
        auth: {
            user: "contact@vistavillaapartments.org",
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        from: '"Vista Villa Apartments" <contact@vistavillaapartments.org>',
        to: to,
        subject: subject,
        text: text,
        html: html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = SendEmail;