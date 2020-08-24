const keyBy = require('lodash/keyBy')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

const expect = validator.expect

/**
 * Performs access control for the brand on a number of contact ids
 * @param {UUID} brand_id Brand id requesting access
 * @param {TAccessActions} op Action the user is trying to perform
 * @param {UUID[]} contact_ids Contact ids to perform access control
 * @returns {Promise<Map<UUID, boolean>>}
 */
async function hasAccess(brand_id, op, contact_ids) {
  expect(contact_ids).to.be.an('array')

  const access = op === 'read' ? 'read' : 'write'
  const rows = await db.select('contact/has_access', [
    Array.from(new Set(contact_ids)),
    brand_id
  ])

  const foundIndex = keyBy(rows, 'id')

  const accessIndex = contact_ids.reduce((index, tid) => {
    return index.set(
      tid,
      foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
    )
  }, new Map())

  return accessIndex
}

/**
 * Get a list of brands who can access contacts
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
}
