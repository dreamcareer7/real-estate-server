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

/**
 * @param {UUID} user 
 * @param {string[]=} roles 
 * @returns {Promise<UUID[]>}
 */
const getUserBrands = async (user, roles) => {
  const res = await db.select('brand/get_user_brands', [user, roles])
  return res.map(r => r.id)
}

/*
 *  The differece between this and getUserBrands is that getUserBrands would also
 * give you the child brands of the brands you have access to.
 * If you want only the direct brands he has access to, not their children, use this one.
 */
const getDirectUserBrands = async (user, roles) => {
  const res = await db.select('brand/get_direct_user_brands', [user, roles])
  return res.map(r => r.brand)
}


module.exports = {
  limitAccess,
  hasAccessToBrands,
  getUserBrands,
  getDirectUserBrands
}
