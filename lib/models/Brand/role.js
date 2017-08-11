const db = require('../../utils/db')

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

Brand.hasAccess = async ({brand, user}) => {
  const roles = await BrandRole.getByUser(brand, user)

  // User is not a member of this brand. Definitely has no access.
  if (roles.length < 1)
    return false

  return true
}

Brand.limitAccess = async ({brand, user}) => {
  const has = Brand.hasAccess({
    brand,
    user
  })

  if (!has)
    return new Error.Forbidden('Access denied to brand resource')
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