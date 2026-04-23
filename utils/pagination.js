/**
 * Parses page/limit from query with safe defaults and caps.
 */
function getPaginationFromQuery(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    let limit = parseInt(String(query.limit || String(defaultLimit)), 10) || defaultLimit;
    if (limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

module.exports = { getPaginationFromQuery };
