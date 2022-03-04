const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 * @typedef {import('../types').DBFacebookPage} DBFacebookPage 
 * @returns {Promise<DBFacebookPage[]>}
 */
const getAll = async (ids) => {
  return await db.select('facebook/facebook_pages/get', [ids])
}


module.exports = {
  getAll
}