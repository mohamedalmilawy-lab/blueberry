const asyncHandler = require('express-async-handler');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const ApiResponse = require('../utils/ApiResponse');

exports.chat = asyncHandler(async (req, res) => {
    const { message: userMessage, history = [] } = req.body;

    if (!userMessage) {
        return ApiResponse.badRequest(res, 'يرجى إرسال رسالة.');
    }

    // 1. جلب البيانات من قاعدة البيانات بالتوازي لتحسين السرعة
    const [availableProducts, allCategories] = await Promise.all([
        Product.find({ isActive: true }).populate('category').populate('banner'),
        Category.find({ isActive: true })
    ]);

    // ─── دالة مساعدة: هل العرض نشط الآن؟ ─────────────────────────────────────
    const now = Date.now();
    const checkOfferActive = (p) =>
        p.offerPrice != null &&
        p.offerPrice > 0 &&
        p.offerPrice <= 100 &&
        (!p.offerEndDate || new Date(p.offerEndDate).getTime() >= now);

    // ─── دالة مساعدة: احسب السعر بعد الخصم ────────────────────────────────────
    const calcDiscounted = (basePrice, discountPct) =>
        Math.round(basePrice * (1 - discountPct / 100) * 100) / 100;

    // ─── دالة مساعدة: تنسيق التاريخ بالعربية ──────────────────────────────────
    const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // 2. بناء بيانات المتجر بشكل منظم واحترافي
    let catalogInfo = "══════════════════════════════════\n";
    catalogInfo    += "    📋 دليل منتجات متجر Blue Berry\n";
    catalogInfo    += "══════════════════════════════════\n";

    // تجميع المنتجات حسب الصنف
    const productsByCat = availableProducts.reduce((acc, p) => {
        const catName = p.category?.name || "عام";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(p);
        return acc;
    }, {});

    Object.keys(productsByCat).forEach(catName => {
        catalogInfo += `\n📌 قسم: ${catName}\n${'─'.repeat(30)}\n`;

        productsByCat[catName].forEach(p => {
            const isOffer      = checkOfferActive(p);
            const discountPct  = isOffer ? p.offerPrice : 0;
            const hasSizes     = p.sizes && p.sizes.length > 0;
            const hasBanners   = p.banner && p.banner.length > 0;

            // ── بادجات المنتج ────────────────────────────────────────────────
            const badges = [];
            if (p.isMostRequested) badges.push("🔥 الأكثر طلباً");
            if (isOffer)           badges.push(`🎁 خصم ${discountPct}%`);
            if (hasBanners)        badges.push("⭐ مميز / إعلاني");

            catalogInfo += `\n▸ اسم المنتج: ${p.name}`;
            if (badges.length > 0) catalogInfo += `  [${badges.join(' | ')}]`;
            catalogInfo += `\n`;

            // ── وصف المنتج ───────────────────────────────────────────────────
            if (p.details) catalogInfo += `  📝 التفاصيل: ${p.details}\n`;

            // ── التسعير ──────────────────────────────────────────────────────
            if (hasSizes) {
                catalogInfo += `  💰 المقاسات والأسعار:\n`;
                p.sizes.forEach(s => {
                    if (isOffer) {
                        const finalPrice = calcDiscounted(s.price, discountPct);
                        catalogInfo += `     • ${s.size}: السعر الأصلي ${s.price}$ ← بعد خصم ${discountPct}% يصبح ${finalPrice}$\n`;
                    } else {
                        catalogInfo += `     • ${s.size}: ${s.price}$\n`;
                    }
                });
            } else {
                // سعر موحد بدون مقاسات
                if (isOffer) {
                    const finalPrice = calcDiscounted(p.price, discountPct);
                    catalogInfo += `  💰 السعر: ${p.price}$ ← بعد خصم ${discountPct}% يصبح ${finalPrice}$\n`;
                } else {
                    catalogInfo += `  💰 السعر: ${p.price}$\n`;
                }
            }

            // ── تاريخ انتهاء العرض (FOMO) ────────────────────────────────────
            if (isOffer && p.offerEndDate) {
                const formattedEnd = formatDate(p.offerEndDate);
                catalogInfo += `  ⏳ العرض ينتهي في: ${formattedEnd} — اغتنم الفرصة قبل فوات الأوان!\n`;
            } else if (isOffer) {
                catalogInfo += `  ⏳ العرض سارٍ حتى نفاد الكمية!\n`;
            }

            // ── ارتباط البانر ────────────────────────────────────────────────
            if (hasBanners) {
                const bannerNames = p.banner.map(b => b.name || 'إعلان').join('، ');
                catalogInfo += `  📣 ظاهر في الإعلانات: ${bannerNames}\n`;
            }
        });
    });

    catalogInfo += `\n══════════════════════════════════\n`;

    // 3. سياسات وتفاصيل المتجر
    const shopPolicies = `
🏠 معلومات المتجر والسياسات:
- اسم المتجر: Blue Berry (بلو بيري).
- المنتجات: حلويات، عصائر، ومنتجات فاخرة.
- طرق الدفع: نوفر الدفع نقداً عند الاستلام (Cash on Delivery).
- التوصيل: متوفر لجميع المناطق، يتم التوصيل عادةً خلال 30-60 دقيقة.
- لطلب أوردر: نحتاج (الاسم، العنوان بالتفصيل، رقم الهاتف، وقائمة الطلبات).
`;

    // 4. بناء الـ System Prompt المحسن
    const systemPrompt = `أنت "بيري" 🫐، المساعد الذكي الودود والمتحمس لمتجر "Blue Berry". مهمتك الأساسية هي مساعدة الزبائن في اختيار أفضل المنتجات وإقناعهم بالشراء بأسلوب لبق واحترافي وممتع.

${shopPolicies}

${catalogInfo}

═══════════════════════════════════════════════
📌 تعليمات الرد — اقرأها بعناية واتبعها بدقة:
═══════════════════════════════════════════════

【1】 الترحيب والتعاطف:
   - ابدأ دائماً بأسلوب مرحب وودود.
   - استمع لاحتياجات الزبون وتفاعل معها قبل أن تعرض المنتجات.

【2】 الأحجام والأسعار (Sizes & Prices):
   - إذا استفسر الزبون عن منتج له عدة مقاسات، اذكر له كل مقاس وسعره الخاص بوضوح.
   - ساعده في اختيار المقاس الأنسب لميزانيته.

【3】 العروض والخصومات 🎁:
   - إذا كان المنتج عليه خصم (offerPrice)، أبرزه بشكل جذاب جداً مع ذكر نسبة الخصم والسعر الأصلي والسعر بعد الخصم.
   - مثال: "🎉 خبر رائع! هذا المنتج عليه خصم استثنائي بنسبة 20%! كان سعره 10$ وأصبح 8$ فقط!"
   - إذا كان هناك تاريخ انتهاء للعرض، استخدمه لخلق شعور بالفرصة المحدودة:
     مثال: "⏳ انتبه! العرض ينتهي في [التاريخ]، اطلب الآن قبل فوات الأوان!"

【4】 المنتجات الأكثر طلباً 🔥:
   - إذا كان الزبون متردداً أو يطلب اقتراحات، رشح له المنتجات الأكثر طلباً بحماس.
   - مثال: "هذا المنتج من أكثر ما يطلبه زبائننا، جرّبه ولن تندم!"

【5】 المنتجات الإعلانية ⭐ (Banners):
   - إذا كان المنتج مرتبطاً ببانر إعلاني، سلط عليه الضوء كتوصية مميزة من المتجر.
   - مثال: "هذا المنتج من ضمن عروضنا المميزة حالياً، نوصيك به بشدة!"

【6】 الإقناع بذكر القيمة:
   - لا تذكر السعر فقط، بل اربطه بجودة المنتج وتفاصيله.
   - استخدم الوصف (details) لتبرير القيمة وإقناع الزبون.

【7】 البيع المتقاطع (Cross-Selling) 🛍️:
   - بعد مساعدة الزبون على اختيار منتج، اقترح عليه منتجاً آخر من نفس الفئة (category) يكمل طلبه.
   - مثال: "وبما أنك اخترت [المنتج]، ربما يعجبك أيضاً [منتج آخر من نفس الفئة]!"

【8】 هيكل الرد المثالي:
   أ) رحب بالزبون وأجب على سؤاله المباشر.
   ب) استعرض تفاصيل المنتج (الاسم، الوصف، المقاسات وأسعارها).
   ج) سلط الضوء بقوة على أي خصم متاح مع FOMO إذا كان هناك تاريخ انتهاء.
   د) اختم بسؤال لطيف يشجع الزبون على اتخاذ إجراء (مثل: "هل تريد أن تجرب؟" أو "أي مقاس يناسبك؟").

【9】 قواعد صارمة — لا تخالفها أبداً:
   - لا تخترع أسعاراً أو مقاسات أو عروضاً غير موجودة في البيانات أعلاه.
   - لا تذكر أي معلومات خارج البيانات المزودة لك.
   - اعتمد 100% على البيانات الموجودة في هذا الـ Prompt.
   - استخدم رموزاً تعبيرية (Emojis) مناسبة لجعل الرد حيوياً وجذاباً.
   - اجعل ردودك منظمة باستخدام نقاط (Bullet points) لتسهيل القراءة.
   - رد دائماً باللغة العربية بلهجة مهذبة (مزيج من الفصحى البسيطة والعامية الخليجية/الشامية).
   - إذا طلب الزبون الشراء، اطلب منه بلباقة: الاسم، العنوان بالتفصيل، ورقم الهاتف.
   - إذا طلب شيئاً غير موجود، اقترح أقرب بديل من نفس القسم.`;

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
            return ApiResponse.send(res, 502, 'عذراً، أنا أواجه مشكلة بسيطة في الاتصال حالياً. هل يمكنك المحاولة مرة أخرى بعد لحظات؟ 🫐');
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            return ApiResponse.ok(res, 'تم إنشاء الرد بنجاح', { reply: data.choices[0].message.content });
        } else {
            return ApiResponse.serverError(res, 'لم أستطع صياغة الرد المناسب حالياً، جرب سؤالي بطريقة أخرى! ✨');
        }

    } catch (error) {
        console.error("Chat Controller Error:", error);
        return ApiResponse.serverError(res, 'حدث خطأ. يرجى إعادى المحاولة');
    }
});
