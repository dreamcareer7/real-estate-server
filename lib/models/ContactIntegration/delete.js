const db = require('../../utils/db.js')



/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('contact_integration/delete', [ids])
}


module.exports = {
  deleteMany
}