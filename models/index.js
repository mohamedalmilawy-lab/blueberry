/**
 * Register all Mongoose models in dependency order so refs/populate never hit MissingSchemaError.
 */
require('./category.model');
require('./product.model');
require('./order.model');
require('./user.model');
require('./adminNotification.model');
require('./banner.model');
require('./deviceToken.model');
require('./discount.model');