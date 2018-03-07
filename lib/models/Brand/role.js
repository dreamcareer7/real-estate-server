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
  const brands_access = await Brand.hasAccessToBrands([brand], user)

  if (!brands_access[brand])
    throw new Error.Forbidden('Access denied to brand resource')
}

/**
 * Checks whether a user has access to a number of brands
 * @param {Iterable<UUID>} brands 
 * @param {UUID} user 
 */
Brand.hasAccessToBrands = async (brands, user) => {
  const res = await db.select('brand/get_user_brands', [user])
  const user_brands = res.map(r => r.id)
  
  const brands_access = {}
  for (const brand_id of brands) {
    brands_access[brand_id] = user_brands.includes(brand_id)
  }

  return brands_access
}

BrandRole.create = async ({brand, role, acl}) => {
  const res = await db.query.promise('brand/role/insert', [
    brand,
    role,
    acl
  ])

  return BrandRole.get(res.rows[0].id)
}

BrandRole.update = async ({id, role, acl}) => {
  await db.query.promise('brand/role/update', [
    id,
    role,
    acl
  ])

  return BrandRole.get(id)
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

BrandRole.associations = {
  members: {
    collection: true,
    enabled: false,
    model: 'User'
  }
}