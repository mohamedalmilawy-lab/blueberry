const mongoose = require('mongoose');
const { Schema } = mongoose;

const discountSchema = new Schema({
    // كود الخصم الفريد (مثال: "SAVE10"، "VIP25")
    code: {
        type: String,
        required: [true, 'كود الخصم مطلوب.'],
        unique: true,
        uppercase: true, // تحويل الحروف تلقائياً إلى كبيرة لتجنب الحساسية لحالة الأحرف عند البحث
        trim: true,
    },

    // قيمة النسبة المئوية للخصم بين 1 و 100
    discountPercentage: {
        type: Number,
        required: [true, 'نسبة الخصم مطلوبة.'],
        min: [1, 'يجب أن تكون نسبة الخصم 1% على الأقل.'],
        max: [100, 'لا يمكن أن تتجاوز نسبة الخصم 100%.'],
    },

    // المستخدم الوحيد المخصص له هذا الكود
    assignedUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'المستخدم المخصص له الكود مطلوب.'],
    },

    // الحد الأقصى لعدد مرات استخدام هذا الكود
    maxUsageLimit: {
        type: Number,
        required: [true, 'الحد الأقصى لعدد مرات الاستخدام مطلوب.'],
        min: [1, 'يجب أن يكون حد الاستخدام مرة واحدة على الأقل.'],
    },

    // عدد المرات التي تم استخدام الكود فيها بالفعل
    currentUsageCount: {
        type: Number,
        default: 0,
        min: 0,
    },

    // يمكن للمسؤول (الأدمن) إلغاء تفعيل الكود دون حذفه من قاعدة البيانات
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true, // لإنشاء حقلي createdAt و updatedAt تلقائياً
});

// فهرسة (Index) للبحث السريع عندما يستعلم المستخدم عن أكواد الخصم النشطة الخاصة به
discountSchema.index({ assignedUser: 1, isActive: 1 });

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;