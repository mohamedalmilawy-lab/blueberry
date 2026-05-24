const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan'); 
const connectDB = require("./config/db");
const {errorHandler}=require('./middlewares/errorHandler');
const http = require('http');
const { initSocket } = require('./config/socket');
dotenv.config();

const app = express();

// 1. الاتصال بقاعدة البيانات
connectDB();
// تسجيل نماذج Mongoose بالترتيب الصحيح (refs / populate)
require('./models');

// 2. Middlewares العامة (يجب أن تكون قبل الـ Routes)
app.use(express.json());
app.use(cors());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 3. تعريف الـ Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 4. دالة معالجة الأخطاء (يجب أن تكون في النهاية تماماً)
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Server is running on http://localhost:${port}`);
});
