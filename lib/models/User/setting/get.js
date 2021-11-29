const db = require('../../../utils/db')

/** @typedef {import('./types').UserSetting} UserSetting */

/**
 * @param {UserSetting['id'][]} ids
 * @returns {Promise<UserSetting[]>}
 */
async function getAll (ids) {
  return db.select('user/settings/get', [ids])
}

/**
 * @param {UUID} user 
 * @param {UUID} brand 
 */
function getOrCreateInBrand(user, brand) {
  return db.selectId('user/settings/get-or-create', [ user, brand ])
}

module.exports = {
  getAll,
  getOrCreateInBrand,
}
