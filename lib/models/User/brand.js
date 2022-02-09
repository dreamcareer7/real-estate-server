const db = require('../../utils/db')

/**
 * Get all brands a user has access to
 * @param {UUID} user 
 * @returns {Promise<UUID[]>}
 */
function getUserBrands(user) {
  return db.selectIds('user/get_user_brands', [ user ])
}

/**
 * @param {UUID} user 
 * @returns {Promise<UUID | null>}
 */
async function getActiveBrand(user) {
  const brands = await getUserBrands(user)
  const [ res ] = await db.select('user/active_brand', [ user, brands ])

  return res?.brand ?? brands[0]
}

module.exports = {
  getUserBrands,
  getActiveBrand,
}
