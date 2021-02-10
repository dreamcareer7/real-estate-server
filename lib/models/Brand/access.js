const db = require('../../utils/db.js')

/**
 * @param {{brand: UUID; user: UUID; roles?: string[]}} arg1
 */
const limitAccess = async ({brand, user, roles}) => {
  const brands_access = await hasAccessToBrands([brand], user, roles)

  if (!brands_access[brand])
    throw Error.Forbidden('Access denied to brand resource')
}

/**
 * Checks whether a user has access to a number of brands
 * @param {Iterable<UUID>} brands
 * @param {UUID} user
 */
const hasAccessToBrands = async (brands, user, roles) => {
  const user_brands = await getUserBrands(user, roles)

  const brands_access = {}
  for (const brand_id of brands) {
    brands_access[brand_id] = user_brands.includes(brand_id)
  }

  return brands_access
}

const getUserBrands = async (user, roles) => {
  const res = await db.select('brand/get_user_brands', [user, roles])
  return res.map(r => r.id)
}

module.exports = {
  limitAccess,
  hasAccessToBrands,
  getUserBrands
}
