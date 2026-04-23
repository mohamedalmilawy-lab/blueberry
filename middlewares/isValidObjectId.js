const mongoose = require('mongoose');
const AppError = require('../utils/AppError'); 

exports.isValidObjectId = (req, res, next, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError(`'${id}' المعرف غير صالح.`, 400));
    }
    next(); 
};
