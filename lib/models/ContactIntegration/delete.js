const db = require('../../utils/db.js')



/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('contact_integration/delete', [ids])
}

/**
 * @param {UUID[]} ids
 */
const restoreMany = async function (ids) {
  await db.select('contact_integration/restore', [ids])
}


module.exports = {
  deleteMany,
  restoreMany
}