/**
 * Callback function
 * @global
 * @callback callback
 * @param {Error#error} err - corresponding error object if any
 * @param {object} res - result object
 */

/**
 * * `Since_C` - returns all objects that have been created since supplied timestamp
 * * `Max_C` - returns all objects that have been created before supplied timestamp
 * * `Since_U` - return all objects that have been updated since supplied timestamp
 * * `Max_U` - return all objects that have been updated before supplied timestamp
 * * `Init_C` - returns the most recently created objects
 * * `Init_U` - returns the most recently updated objects
 * @typedef pagination_type
 * @global
 * @enum {string}
 */

/**
 * @typedef pagination
 * @type object
 * @global
 * @param {pagination_type} type - type of pagination
 * @param {timestamp} timestamp - supplied timestamp @see pagination_type
 * @param {number} limit - maximum number of items in resulting collection
 */
