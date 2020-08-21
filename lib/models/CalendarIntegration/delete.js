const db = require('../../utils/db.js')



/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('calendar_integration/delete', [ids])
}


module.exports = {
  deleteMany
}