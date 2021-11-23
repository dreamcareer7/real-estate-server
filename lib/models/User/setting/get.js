const db = require('../../../utils/db')

/** @typedef {import('./types').UserSetting} UserSetting */

/**
 * @param {UserSetting['id'][]} ids
 * @returns {Promise<UserSetting[]>}
 */
async function getAll (ids) {
  return db.select('user/settings/get', [ids])
}

module.exports = {
  getAll,
}
