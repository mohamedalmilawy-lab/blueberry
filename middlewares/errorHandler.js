// middlewares/errorHandler.js
const ApiResponse = require('../utils/ApiResponse');

/**
 * Global Express error-handling middleware.
 *
 * Must be registered LAST in app.js (after all routes) with exactly 4 parameters
 * so Express identifies it as an error handler.
 *
 * All unhandled errors – whether thrown via `throw new AppError(...)` or
 * forwarded via `next(err)` – will be caught here and serialised using the
 * standard ApiResponse envelope:
 *
 *   {
 *     "StatusCode": <number>,
 *     "Message":    "<error message>",
 *     "Data":       null
 *   }
 */
const errorHandler = (err, req, res, next) => {
    // Determine the correct HTTP status code.
    // AppError carries its own statusCode; generic errors default to 500.
    const statusCode = err.statusCode || 500;

    // In development, log the full stack trace for easier debugging.
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[Error] ${statusCode} – ${err.message}`);
        console.error(err.stack);
    }

    return ApiResponse.send(res, statusCode, err.message || 'خطأ داخلي في الخادم', null);
};

module.exports = { errorHandler };
