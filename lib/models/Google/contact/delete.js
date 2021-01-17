const db = require('../../../utils/db.js')



/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('google/contact/delete', [ids])
}

/**
 * @param {UUID[]} ids
 */
const restoreMany = async function (ids) {
  await db.select('google/contact/restore', [ids])
}


module.exports = {
  deleteMany,
  restoreMany
}