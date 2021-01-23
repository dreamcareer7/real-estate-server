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

const getByUser = async (user, {limit, start, mediums, template_types}) => {
  const res = await db.query.promise('template/instance/by-user', [
    user,
    template_types,
    mediums,
    limit,
    start
  ])

  const ids = res.rows.map(r => r.id)

  const instances = await getAll(ids)

  const [ first ] = instances
  if (first) first.total = res.rows[0].total

  return instances
}

module.exports = {
  get,
  getAll,
  getByUser,
}
