/**
 * Lazy Firebase Admin initialization. Set FIREBASE_SERVICE_ACCOUNT_JSON to a JSON string
 * of the service account, or set GOOGLE_APPLICATION_CREDENTIALS to a file path.
 */
function getFirebaseApp() {
    const admin = require('firebase-admin');
    if (admin.apps && admin.apps.length) {
        return admin.app();
    }
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json && json.trim()) {
        let cred;
        try {
            // إصلاح مشاكل مختلفة في JSON من ملف الـ .env
            let sanitizedJson = json.trim();
            
            // إزالة علامات الاقتباس المحيطة إذا كانت موجودة (مثل "{"type":"service_account"}")
            if ((sanitizedJson.startsWith('"') && sanitizedJson.endsWith('"')) ||
                (sanitizedJson.startsWith("'") && sanitizedJson.endsWith("'"))) {
                sanitizedJson = sanitizedJson.slice(1, -1);
            }
            
            // 1. استبدال أي نوع من الأسطر الجديدة بـ \n بشكل صحيح
            sanitizedJson = sanitizedJson
                // استبدال كل أنواع الأسطر الجديدة الحقيقية
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                // استبدال جميع الأسطر الجديدة المكسورة بشكل صحيح
                .replace(/\n/g, '\\n');
            
            // 2. إزالة أو استبدال كل الأحرف التحكم غير المرغوب فيها
            sanitizedJson = sanitizedJson
                .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ''); // إزالة كل الحروف التحكم ما عدا \t و \n
                
            // 3. محاولة تحليل الـ JSON الآن
            cred = JSON.parse(sanitizedJson);
        } catch (err) {
            console.error('FIREBASE_SERVICE_ACCOUNT_JSON parsing error:', err);
            console.error('Raw value (truncated):', json.substring(0, 1000));
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
        }
        return admin.initializeApp({
            credential: admin.credential.cert(cred)
        });
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
    return null;
}

function isFcmConfigured() {
    return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/**
 * Sends the same notification to many FCM registration tokens (batching).
 * @returns {{ successCount: number, failureCount: number }}
 */
async function sendMulticastToTokens(tokens, { title, body }) {
    const admin = require('firebase-admin');
    const app = getFirebaseApp();
    if (!app) {
        throw new Error('خدمة الإشعارات غير مهيأة');
    }
    const unique = [...new Set(tokens.filter(Boolean))];
    if (unique.length === 0) {
        return { successCount: 0, failureCount: 0 };
    }

    const messaging = admin.messaging(app);
    const chunkSize = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const res = await messaging.sendEachForMulticast({
            tokens: chunk,
            notification: { title, body }
        });
        successCount += res.successCount;
        failureCount += res.failureCount;
    }

    return { successCount, failureCount };
}

module.exports = { getFirebaseApp, isFcmConfigured, sendMulticastToTokens };
