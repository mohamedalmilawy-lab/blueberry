const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
    'string.pattern.base': 'معرف غير صالح'
});

const paginationQuery = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
});

const publicProductsQuery = paginationQuery.keys({
    search: Joi.string().trim().max(120).allow(''),
    category: objectId,
    priceMin: Joi.number().min(0),
    priceMax: Joi.number().min(0),
    sort: Joi.string().valid('newest', 'priceAsc', 'priceDesc', 'name').default('newest')
});

const adminProductsQuery = publicProductsQuery.keys({
    isActive: Joi.boolean(),
    isMostRequested: Joi.boolean(),
    name: Joi.string().trim().max(120).allow('')
});

module.exports = {
    paginationQuery,
    publicProductsQuery,
    adminProductsQuery
};
