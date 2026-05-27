const asyncHandler = require('express-async-handler');
const sendEmail = require('../utils/sendEmail'); 
const User = require('../models/user.model');

/**
 * @desc    إرسال رسالة من صفحة "اتصل بنا"
 * @route   POST /api/contact
 * @access  Public (مع إمكانية تحديد المستخدم المسجل)
 */
exports.sendMessage = asyncHandler(async (req, res) => { 
    let senderName;
    let senderPhone;

    if (req.user) {
        const user = await User.findById(req.user.id);
        senderName = user.fullName;
        senderPhone = (user.phone) ? user.phone: "";
    } else {
        senderName = req.body.fullName;
        senderPhone = (req.body.phone) ? req.body.phone: "";
    }

    const subject = req.body.subject || 'رسالة جديدة من Blue Berry';
    const message = req.body.message;

    if (!senderName || !message) {
        return res.status(400).json({ 
            message: "الرجاء تعبئة جميع الحقول المطلوبة. إذا كنت زائراً، تأكد من إدخال الاسم والرقم والرسالة." 
        });
    }

    const emailMessage = `
        لقد تلقيت رسالة جديدة من صفحة "اتصل بنا" في متجر Blue Berry.
        --------------------------------------------------
        اسم المرسل: ${senderName}
        رقم المرسل: ${senderPhone}
        ${req.user ? '(مستخدم مسجل في النظام)' : '(زائر)'}
        --------------------------------------------------
        نص الرسالة:
        ${message}
    `;

    await sendEmail({
        email: process.env.EMAIL_USERNAME,
        subject: subject || `رسالة جديدة من ${senderName}`,
        message: emailMessage,
    });

    res.status(200).json({ success: true, message: "شكراً لك، تم إرسال رسالتك بنجاح!" });

});
