const db = require('../../utils/db')

/**
 * @param {UUID} id 
 */
const get = async id => {
  const templates = await getAll([id])

  if (templates.length < 1) {
    throw Error.ResourceNotFound(`Template ${id} not found`)
  }

  return templates[0]
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IStoredTemplate[]>}
 */
const getAll = async ids => {
  const { rows } = await db.query.promise('template/get', [ids])
  return rows
}


module.exports = {
  get,
  getAll
}
