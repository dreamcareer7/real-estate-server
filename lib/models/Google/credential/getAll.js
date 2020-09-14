const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('google/credential/get', [ids])
}


module.exports = {
  getAll
}