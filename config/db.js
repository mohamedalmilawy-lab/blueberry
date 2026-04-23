// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // احذف الخيارات من هنا
        await mongoose.connect(process.env.MONGO_URI); 
        console.log('✅ MongoDB Connected Successfuly...');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
