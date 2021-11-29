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
  console.log(brands)
  const { brand } = await db.selectOne('user/active_brand', [ user, brands ])
  console.log(brand)

  return brand
}

module.exports = {
  getUserBrands,
  getActiveBrand,
}
