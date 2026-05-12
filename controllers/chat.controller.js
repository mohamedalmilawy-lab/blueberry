const asyncHandler = require('express-async-handler');
const Category = require('../models/category.model');
const Product = require('../models/product.model');

exports.chat = asyncHandler(async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ reply: "يرجى إرسال رسالة." });
    }

    // 1. جلب البيانات من قاعدة البيانات بالتوازي لتحسين السرعة
    const [availableProducts, allCategories] = await Promise.all([
        Product.find({ isActive: true }).populate('category').limit(100),
        Category.find({ isActive: true })
    ]);

    // 2. بناء كتالوج المتجر بشكل منظم
    let catalogText = "بيانات المتجر المتاحة حالياً:\n";

    // تجميع المنتجات حسب الصنف في الذاكرة لتقليل عمليات البحث (Optimization)
    const productsGroupedByCat = availableProducts.reduce((acc, p) => {
        const catId = p.category?._id?.toString();
        if (catId) {
            if (!acc[catId]) acc[catId] = [];
            acc[catId].push(p);
        }
        return acc;
    }, {});

    catalogText += "\n--- الأصناف والمنتجات ---\n";
    allCategories.forEach(category => {
        const categoryProducts = productsGroupedByCat[category._id.toString()] || [];
        const productNames = categoryProducts.length > 0 
            ? categoryProducts.map(p => p.name).join('، ') 
            : "لا يوجد منتجات حالياً في هذا الصنف";
            
        catalogText += `- الصنف: ${category.name} | المنتجات: [${productNames}]\n`;
    });

    catalogText += "\n--- قائمة الأسعار التفصيلية ---\n";
    availableProducts.forEach(product => {
        const price = product.offerPrice && product.offerPrice < product.price 
            ? `${product.offerPrice}$ (عرض خاص بدل ${product.price}$)` 
            : `${product.price}$`;
        catalogText += `- منتج "${product.name}": بسعر ${price}\n`;
    });

    // 3. سياسات المتجر
    const policies = `
--- سياسات المتجر ---
- الشحن والدفع: نوفر خدمة الدفع عند الاستلام (ديليفري) أو عبر خدمة "شام كاش".
- إجراءات الطلب: لتأكيد طلبك، نحتاج منك تزويدنا بالعنوان الكامل ورقم الهاتف.
- التوصيل: يتم التوصيل خلال ساعة عمل واحدة بعد تأكيد البيانات.
`;

    // 4. بناء الـ System Prompt
    const systemPrompt = `أنت مساعد ذكي في متجر "Blue Berry".
أجب بلباقة واحترافية بناءً على البيانات التالية فقط:

${catalogText}
${policies}

تعليمات صارمة:
1. إذا سأل المستخدم عن صنف، اذكر له المنتجات المتاحة فيه فقط.
2. إذا طلب الشراء، أخبره بوسائل الدفع (عند الاستلام أو شام كاش) واطلب منه (الاسم، العنوان، رقم الهاتف).
3. لا تقترح أي وجبات أو أسعار غير موجودة في القائمة أعلاه.
4. إذا سألك عن شيء غير موجود، اعتذر بلباقة وأخبره بما هو متاح لديك.`;

    // 5. الاتصال بـ OpenRouter
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7 // توازن بين الإبداع والدقة
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter Error:", errorData);
            return res.status(502).json({ reply: "عذراً، المساعد الذكي غير متاح حالياً. حاول لاحقاً." });
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return res.json({ reply: data.choices[0].message.content });
        } else {
            return res.status(500).json({ reply: "لم أتمكن من معالجة الرد، يرجى المحاولة مرة أخرى." });
        }

    } catch (error) {
        console.error("Chat Controller Error:", error);
        return res.status(500).json({ reply: "حدث خطأ في الاتصال بالسيرفر." });
    }
});
