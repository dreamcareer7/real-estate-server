const db = require('../../../utils/db')

const get = async id => {
  const instances = await getAll([id])

  if (instances.length < 1)
    throw Error.ResourceNotFound(`Template instance ${id} not found`)

  return instances[0]
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IStoredTemplateInstance[]>}
 */
const getAll = async ids => {
  const res = await db.query.promise('template/instance/get', [ids])
  return res.rows
}

const getByUser = async user => {
  const res = await db.query.promise('template/instance/by-user', [
    user
  ])

  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByUser,
}
