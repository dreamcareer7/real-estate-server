const db = require('../../utils/db')

const get = async id => {
  const templates = await getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Template ${id} not found`)

  return templates[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('template/get', [ids])
  return rows
}

module.exports = {
  get,
  getAll
}
