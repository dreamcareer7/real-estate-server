const db = require('../../../utils/db')

const get = async id => {
  const users = await getAll([id])

  if (users.length < 1)
    throw Error.ResourceNotFound(`Brand User ${id} not found`)

  return users[0]
}

const getAll = async ids => {
  return db.select('brand/role/member/get', [ids])
}

module.exports = {
  get,
  getAll
}
