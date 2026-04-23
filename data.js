/**
 * Dummy seed data for "Juice and Sweets" e-commerce (Arabic labels).
 * Categories use `key` for stable linking from products in the seeder.
 */
module.exports = {
    categories: [
        {
            key: 'fresh-juices',
            name: 'عصائر طازجة',
            image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800',
            isActive: true
        },
        {
            key: 'smoothies',
            name: 'سموثي ومشروبات باردة',
            image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800',
            isActive: true
        },
        {
            key: 'oriental-sweets',
            name: 'حلويات شرقية',
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
            isActive: true
        },
        {
            key: 'chocolate-desserts',
            name: 'شوكولاتة وحلويات غربية',
            image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800',
            isActive: true
        },
        {
            key: 'nuts-dried',
            name: 'مكسرات ومجففات',
            image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800',
            isActive: true
        }
    ],
    products: [
        {
            name: 'عصير برتقال طازج',
            categoryKey: 'fresh-juices',
            images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800'],
            details: 'عصير برتقال معصور يومياً بدون إضافات.',
            price: 4500,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'عصير رمان',
            categoryKey: 'fresh-juices',
            images: ['https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800'],
            details: 'رمان حلبي منعش، غني بالمضادات الأكسدة.',
            price: 6000,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'عصير مانجو استوائي',
            categoryKey: 'fresh-juices',
            images: ['https://images.unsplash.com/photo-1546173159-315724a31696?w=800'],
            details: 'مانجو كريمي مع لمسة ليمون.',
            price: 5500,
            offerPrice: 4900,
            isActive: true,
            isMostRequested: false
        },
        {
            name: 'سموثي فراولة وموز',
            categoryKey: 'smoothies',
            images: ['https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800'],
            details: 'مزيج سميك مع حليب وزبادي.',
            price: 7000,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'موهيتو نعناع بدون كحول',
            categoryKey: 'smoothies',
            images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'],
            details: 'نعناع، ليمون، سودا خفيفة.',
            price: 5000,
            isActive: true,
            isMostRequested: false
        },
        {
            name: 'بقلاوة فستق حلبية',
            categoryKey: 'oriental-sweets',
            images: ['https://images.unsplash.com/photo-1598300056393-4aac492f4344?w=800'],
            details: 'طبقات رقيقة مع فستق حلبي وسكب شراب خفيف.',
            price: 12000,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'كنافة نابلسية',
            categoryKey: 'oriental-sweets',
            images: ['https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800'],
            details: 'جبنة مطاطية مع قطر ورد.',
            price: 9500,
            offerPrice: 8500,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'معمول تمر سعودي',
            categoryKey: 'oriental-sweets',
            images: ['https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800'],
            details: 'صناعة يدوية، تمر مجهول.',
            price: 7500,
            isActive: true,
            isMostRequested: false
        },
        {
            name: 'براونيز شوكولاتة داكنة',
            categoryKey: 'chocolate-desserts',
            images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800'],
            details: 'شوكولاتة 70% مع قطع جوز.',
            price: 6500,
            isActive: true,
            isMostRequested: false
        },
        {
            name: 'تشيز كيك توت أزرق',
            categoryKey: 'chocolate-desserts',
            images: ['https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800'],
            details: 'قاعدة بسكويت وطبقة كريمية.',
            price: 11000,
            isActive: true,
            isMostRequested: true
        },
        {
            name: 'مكس فواكه مجففة',
            categoryKey: 'nuts-dried',
            images: ['https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800'],
            details: 'تين، مشمش، زبيب، لوز.',
            price: 8500,
            isActive: true,
            isMostRequested: false
        },
        {
            name: 'لوز محمص مملح',
            categoryKey: 'nuts-dried',
            images: ['https://images.unsplash.com/photo-1508747703725-719777637510?w=800'],
            details: 'وجبة خفيفة مثالية مع العصير.',
            price: 5500,
            isActive: true,
            isMostRequested: false
        }
    ]
};
