const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. إنشاء الـ Transporter (الناقل)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // أو أي خدمة أخرى مثل SendGrid أو Yahoo
        auth: {
            user: process.env.EMAIL_USERNAME, // إيميلك
            pass: process.env.EMAIL_PASSWORD  // كلمة المرور (App Password)
        }
    });

    // 2. تجهيز خيارات الإيميل
    const mailOptions = {
        from: `"متجر Blue Berry" <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // 3. إرسال الإيميل فعلياً
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
