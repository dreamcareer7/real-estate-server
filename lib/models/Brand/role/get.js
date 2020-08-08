const db = require('../../../utils/db')
const Orm = require('../../Orm/context')

const get = async id => {
  const roles = await getAll([id])

  if (roles.length < 1)
    throw Error.ResourceNotFound(`Brand Role ${id} not found`)

  return roles[0]
}

const getAll = async ids => {
  const users = Orm.getAssociationConditions('brand_role.members') || null
  return db.select('brand/role/get', [ids, users])
}

const getByBrand = async brand => {
  const ids = await db.selectIds('brand/role/by_brand', [
    brand
  ])

  return getAll(ids)
}

const getByUser = async (brand, user) => {
  return db.selectIds('brand/role/by_user', [
    brand,
    user
  ])
}

module.exports = {
  get,
  getAll,
  getByUser,
  getByBrand
}
