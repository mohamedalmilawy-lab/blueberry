/**
 * utils/ApiResponse.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardised response helper.
 *
 * Every response produced by this helper follows the contract:
 *   {
 *     "StatusCode" : <HTTP status code>,
 *     "Message"    : "<human-readable message>",
 *     "Data"       : <payload | null>
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

class ApiResponse {
    /**
     * Build the standard response envelope.
     *
     * @param {number} statusCode - HTTP status code (e.g. 200, 201, 400, 404)
     * @param {string} message    - Human-readable message
     * @param {*}      data       - Response payload (object, array, or null)
     * @returns {{ StatusCode: number, Message: string, Data: * }}
     */
    static build(statusCode, message, data = null) {
        return {
            StatusCode: statusCode,
            Message: message,
            Data: data,
        };
    }

    // ─── Success helpers ──────────────────────────────────────────────────────

    /**
     * Send a 200 OK response.
     * @param {import('express').Response} res
     * @param {string} message
     * @param {*}      data
     */
    static ok(res, message = 'تمت العملية بنجاح', data = null) {
        return res.status(200).json(this.build(200, message, data));
    }

    /**
     * Send a 201 Created response.
     * @param {import('express').Response} res
     * @param {string} message
     * @param {*}      data
     */
    static created(res, message = 'تم الإنشاء بنجاح', data = null) {
        return res.status(201).json(this.build(201, message, data));
    }

    // ─── Error helpers ────────────────────────────────────────────────────────

    /**
     * Send a 400 Bad Request response.
     * @param {import('express').Response} res
     * @param {string} message
     * @param {*}      data   - Optional validation details or extra context
     */
    static badRequest(res, message = 'طلب غير صالح', data = null) {
        return res.status(400).json(this.build(400, message, data));
    }

    /**
     * Send a 401 Unauthorized response.
     * @param {import('express').Response} res
     * @param {string} message
     */
    static unauthorized(res, message = 'طلب غير مصرح به') {
        return res.status(401).json(this.build(401, message, null));
    }

    /**
     * Send a 403 Forbidden response.
     * @param {import('express').Response} res
     * @param {string} message
     */
    static forbidden(res, message = 'تم حظر الوصول') {
        return res.status(403).json(this.build(403, message, null));
    }

    /**
     * Send a 404 Not Found response.
     * @param {import('express').Response} res
     * @param {string} message
     */
    static notFound(res, message = 'المورد المطلوب غير موجود') {
        return res.status(404).json(this.build(404, message, null));
    }

    /**
     * Send a 500 Internal Server Error response.
     * @param {import('express').Response} res
     * @param {string} message
     */
    static serverError(res, message = 'حدث خطأ داخلي في الخادم') {
        return res.status(500).json(this.build(500, message, null));
    }

    /**
     * Generic send – useful when the status code is only known at runtime.
     *
     * @param {import('express').Response} res
     * @param {number} statusCode
     * @param {string} message
     * @param {*}      data
     */
    static send(res, statusCode, message, data = null) {
        return res.status(statusCode).json(this.build(statusCode, message, data));
    }
}

module.exports = ApiResponse;
