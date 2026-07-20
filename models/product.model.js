const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: ملاحظة زبون على منتج (للأدمن فقط) ────────────────────────────
const customerNoteSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        noteText: {
            type: String,
            required: true,
            trim: true,
            maxlength: [1000, 'الملاحظة لا يمكن أن تتجاوز 1000 حرف.']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: true }
);

// ─── Sub-schema: مقاس المنتج مع سعره الخاص ────────────────────────────────────
const productSizeSchema = new Schema(
    {
        size: {
            type: String, // النوع String كما طلبت
            required: [true, 'المقاس مطلوب.'],
            default: 'صغير' // إضافة القيمة الافتراضية هنا
        },
        price: {
            type: Number,
            required: [true, 'سعر المقاس مطلوب.'],
            min: [0, 'سعر المقاس لا يمكن أن يكون سالبًا.']
        }
    },
    { _id: false }
);

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String,
        required: true
    }],
    details: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative.']
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    banner: [{
        type: Schema.Types.ObjectId,
        ref: 'Banner'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isMostRequested: {
        type: Boolean,
        default: false
    },
    // نسبة خصم مئوية (0–100). مثال: 20 يعني خصم 20% على سعر المنتج أو المقاس.
    offerPrice: {
        type: Number,
        min: [0, 'نسبة الخصم لا يمكن أن تكون سالبة.'],
        max: [100, 'نسبة الخصم لا يمكن أن تتجاوز 100%.']
    },
    // تاريخ انتهاء العرض — إذا مرّ هذا التاريخ تُهمَل نسبة الخصم تلقائياً
    offerEndDate: {
        type: Date
    },
    // ─── مقاسات المنتج: كل مقاس (1 أو 2 أو 3) له سعر مستقل ───────────────────
    sizes: {
        type: [productSizeSchema],
        default: []
    },
    // ─── ملاحظات الزبائن: مخفية عن الواجهة العامة، للأدمن فقط ──────────────────
    customerNotes: {
        type: [customerNoteSchema],
        default: [],
        select: false   // مخفي بشكل افتراضي في كل الاستعلامات
    }
}, {
    timestamps: true
});

productSchema.index({ name: 'text', details: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ isMostRequested: 1, isActive: 1 });
productSchema.index({ banner: 1 }); 

const Product = mongoose.model('Product', productSchema);

module.exports = Product;