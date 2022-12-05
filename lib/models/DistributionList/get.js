const db = require('../../utils/db')
const { filter } = require('./filter')

/**
 * @param {UUID[]} ids
 * @typedef {import('./types').Distribution_list} Distribution_list
 * @returns {Promise<Distribution_list[]>}
 */
const getAll = async (ids) => {
  return db.select('distribution_lists_contacts/get', [ids])
}

/**
 * Get all distribution_lists assigned to this postal code
 * @param {string[]} postalCodes - brand id
 * @returns {Promise<Distribution_list[]>}
 */

const getByPostalCode = async (postalCodes) => {  
  const result = await filter(postalCodes)
  if (!result.total) {
    return []
  }

  const posts = await getAll(result.ids)

  // @ts-ignore
  posts[0].total = result.total
  return posts
}

module.exports = {
  getAll,
  getByPostalCode,
}
