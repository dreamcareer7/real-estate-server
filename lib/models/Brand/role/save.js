const db = require('../../../utils/db')

const { get } = require('./get')

const create = async ({brand, role, acl}) => {
  const id = await db.insert('brand/role/insert', [
    brand,
    role,
    acl
  ])

  return get(id)
}

const update = async ({id, role, acl}) => {
  await db.update('brand/role/update', [
    id,
    role,
    acl
  ])

  return get(id)
}

const _delete = async id => {
  return db.update('brand/role/delete', [id])
}

module.exports = {
  create,
  update,
  delete: _delete
}
