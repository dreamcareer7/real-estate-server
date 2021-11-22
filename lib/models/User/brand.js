const db = require('../../utils/db')

/**
 * Get all brands a user has access to
 * @param {UUID} user 
 * @returns {Promise<UUID[]>}
 */
function getUserBrands(user) {
  return db.selectIds('user/get_user_brands', [ user ])
}

module.exports = {
  getUserBrands,
}
