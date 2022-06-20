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

const getByRoleAndUser = async (role, user) => {
  return db.selectId('brand/role/member/get-by-role', [role, user])
}

module.exports = {
  get,
  getAll,
  getByRoleAndUser,
}
