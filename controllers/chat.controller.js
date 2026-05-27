const asyncHandler = require('express-async-handler');
const Category = require('../models/category.model');
const Product = require('../models/product.model');

exports.chat = asyncHandler(async (req, res) => {
    const { message: userMessage, history = [] } = req.body;

    if (!userMessage) {
        return res.status(400).json({ reply: "يرجى إرسال رسالة." });
    }

    // 1. جلب البيانات من قاعدة البيانات بالتوازي لتحسين السرعة
    const [availableProducts, allCategories] = await Promise.all([
        Product.find({ isActive: true }).populate('category'),
        Category.find({ isActive: true })
    ]);

    // 2. بناء بيانات المتجر بشكل منظم واحترافي
    let catalogInfo = "قائمة المنتجات المتاحة في المتجر:\n";

    // تجميع المنتجات حسب الصنف
    const productsByCat = availableProducts.reduce((acc, p) => {
        const catName = p.category?.name || "عام";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(p);
        return acc;
    }, {});

    Object.keys(productsByCat).forEach(catName => {
        catalogInfo += `\n📌 قسم: ${catName}\n`;
        productsByCat[catName].forEach(p => {
            const hasOffer = p.offerPrice && p.offerPrice < p.price;
            const priceText = hasOffer 
                ? `${p.offerPrice}$ (عرض خاص! السعر الأصلي ${p.price}$)` 
                : `${p.price}$`;
            
            const features = [];
            if (p.isMostRequested) features.push("🔥 الأكثر طلباً");
            if (hasOffer) features.push("🎁 عرض محدود");

            catalogInfo += `- ${p.name}: ${priceText} ${features.length > 0 ? `[${features.join(' | ')}]` : ''}\n`;
            if (p.details) catalogInfo += `  وصف المنتج: ${p.details}\n`;
        });
    });

    // 3. سياسات وتفاصيل المتجر
    const shopPolicies = `
🏠 معلومات المتجر والسياسات:
- اسم المتجر: Blue Berry (بلو بيري).
- المنتجات: حلويات، عصائر، ومنتجات فاخرة.
- طرق الدفع: نوفر الدفع نقداً عند الاستلام (Cash on Delivery) ".
- التوصيل: متوفر لجميع المناطق، يتم التوصيل عادةً خلال 30-60 دقيقة.
- لطلب أوردر: نحتاج (الاسم، العنوان بالتفصيل، رقم الهاتف، وقائمة الطلبات).
- العروض: العروض المذكورة أعلاه سارية حتى نفاد الكمية.
`;

    // 4. بناء الـ System Prompt المحسن
    const systemPrompt = `أنت "بيري"، المساعد الذكي الودود لمتجر "Blue Berry". 
مهمتك هي مساعدة الزبائن في اختيار أفضل المنتجات والإجابة على استفساراتهم بلباقة واحترافية.

${shopPolicies}

${catalogInfo}

تعليمات الرد:
1. كن ودوداً جداً واستخدم رموزاً تعبيرية (Emojis) مناسبة.
2. إذا سأل الزبون عن منتج معين، أعطه السعر والوصف وشجعه على التجربة إذا كان "الأكثر طلباً".
3. إذا سأل عن "عرض" أو "تخفيض"، ركز على المنتجات التي لديها "عرض خاص".
4. عند الرغبة في الطلب، اطلب منه البيانات التالية بلباقة: (الاسم، العنوان، رقم الهاتف).
5. إذا طلب شيئاً غير موجود، اقترح عليه أقرب بديل متاح من نفس القسم.
6. اجعل ردودك منظمة باستخدام نقاط (Bullet points) لتسهيل القراءة.
7. لا تذكر أي أسعار أو معلومات خارج البيانات المزودة أعلاه.
8. رد دائماً باللغة العربية بلهجة مهذبة (مزيج بين الفصحى البسيطة والبيضاء).`;

    // 5. تجهيز الرسائل (مع دعم التاريخ إن وجد)
    const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-5), // نأخذ آخر 5 رسائل فقط للحفاظ على الـ Context دون استهلاك Tokens كثير
        { role: "user", content: userMessage }
    ];

    // 6. الاتصال بـ OpenRouter
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: messages,
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter API Error:", errorData);
            return res.status(502).json({ reply: "عذراً، أنا أواجه مشكلة بسيطة في الاتصال حالياً. هل يمكنك المحاولة مرة أخرى بعد لحظات؟ 🫐" });
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return res.json({ reply: data.choices[0].message.content });
        } else {
            return res.status(500).json({ reply: "لم أستطع صياغة الرد المناسب حالياً، جرب سؤالي بطريقة أخرى! ✨" });
        }

    } catch (error) {
        console.error("Chat Controller Error:", error);
        return res.status(500).json({ reply: "حدث خطأ. يرجى إعادى المحاولة" });
    }
});
