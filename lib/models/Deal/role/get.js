const db = require('../../../utils/db')

const get = async id => {
  const roles = await getAll([id])

  if (roles.length < 1)
    throw Error.ResourceNotFound(`Deal role ${id} not found`)

  return roles[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('deal/role/get', [ids])
  return rows
}

module.exports = {
  get,
  getAll
}
