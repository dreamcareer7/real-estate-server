const keyBy = require('lodash/keyBy')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

const expect = validator.expect

/**
 * Performs access control for the brand on a number of contact ids
 * @param {UUID} brand_id Brand id requesting access
 * @param {UUID} brand_id User id requesting access
 * @param {TAccessActions} op Action the user is trying to perform
 * @param {UUID[]} contact_ids Contact ids to perform access control
 * @returns {Promise<Map<UUID, boolean>>}
 */
async function hasAccess(brand_id, user_id, op, contact_ids) {
  expect(contact_ids).to.be.an('array')

  const access = op || 'write'
  const rows = await db.select('contact/has_access', [
    Array.from(new Set(contact_ids)),
    brand_id,
    user_id,
  ])

  const foundIndex = keyBy(rows, 'id')

  require('fs').writeFileSync('/tmp/access' + Date.now() + '.json', JSON.stringify(foundIndex, null, 2))

  const accessIndex = contact_ids.reduce((index, tid) => {
    return index.set(
      tid,
      foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
    )
  }, new Map())

  return accessIndex
}

/**
 * @param {UUID} user 
 * @param {UUID} brand 
 */
async function limitBrandAccess(user, brand) {
  const brands_access = await hasAccessToBrands([brand], user)

  if (!brands_access[brand])
    throw Error.Forbidden('Access denied to brand resource')
}

/**
 * Checks whether a user has access to a number of brands
 * @param {Iterable<UUID>} brands
 * @param {UUID} user
 */
const hasAccessToBrands = async (brands, user) => {
  const user_brands = await getUserBrands(user)

  const brands_access = {}
  for (const brand_id of brands) {
    brands_access[brand_id] = user_brands.includes(brand_id)
  }

  return brands_access
}

/**
 * @param {UUID} user 
 */
const getUserBrands = async (user) => {
  return db.selectIds('contact/access/get_user_brands', [user])
}

/**
 * Get a list of all brands that can access a set of contacts
 * @param {UUID[]} contact_ids 
 * @returns {Promise<UUID[]>}
 */
function authorizedBrands(contact_ids) {
  return db.selectIds('contact/authorized_brands', [
    contact_ids
  ])
}

module.exports = {
  hasAccess,
  authorizedBrands,
  limitBrandAccess,
  hasAccessToBrands,
  getUserBrands,
}
