const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('facebook/facebook_pages/get', [ids])
}


module.exports = {
  getAll
}