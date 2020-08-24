const db = require('../../../utils/db')


/**
 * @param {UUID[]} ids 
 * @returns {Promise<IBrandEvent[]>}
 */
const getAll = async (ids) => {
  return db.select('brand/event/get', [ids])
}


module.exports = {
  getAll
}