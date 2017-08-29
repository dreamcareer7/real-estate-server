const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

BrandRole = {}

Orm.register('brand_role', 'BrandRole')

BrandRole.get = async id => {
  const roles = await BrandRole.getAll([id])

  if (roles.length < 1)
    throw new Error.ResourceNotFound(`Brand Role ${id} not found`)

  return roles[0]
}

BrandRole.getAll = async ids => {
  const res = await db.query.promise('brand/role/get', [ids])

  return res.rows
}

BrandRole.getByBrand = async brand => {
  const res = await db.query.promise('brand/role/by_brand', [
    brand
  ])

  const ids = res.rows.map(r => r.id)

  return BrandRole.getAll(ids)
}

BrandRole.getByUser = async (brand, user) => {
  const res = await db.query.promise('brand/role/by_user', [
    brand,
    user
  ])

  return res.rows
}

Brand.limitAccess = async ({brand, user}) => {
  const res = await db.query.promise('brand/role/has_access', [
    user,
    brand
  ])

  if (!res.rows[0].has)
    throw new Error.Forbidden('Access denied to brand resource')
}

BrandRole.create = async ({brand, role}) => {
  const res = await db.query.promise('brand/role/insert', [
    brand,
    role
  ])

  return BrandRole.get(res.rows[0].id)
}

BrandRole.delete = async id => {
  return db.query.promise('brand/role/delete', [id])
}

BrandRole.addMember = async ({role, user}) => {
  await db.query.promise('brand/role/member/add', [
    role,
    user
  ])

  return promisify(User.get)(user)
}

BrandRole.removeMember = async (role, user) => {
  await db.query.promise('brand/role/member/remove', [
    role,
    user
  ])
}

BrandRole.getMembers = async role => {
  const res = await db.query.promise('brand/role/member/by_role', [role])
  const users = res.rows.map(r => r.user)
  return promisify(User.getAll)(users)
}