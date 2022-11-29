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
 * @param {string} postalCode - brand id
 * @returns {Promise<Distribution_list[]>}
 */

const getByPostalCode = async (postalCode) => {  
  const result = await filter(postalCode)
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
