const url = require('url')
const db = require('../../utils/db.js')
const config = require('../../config.js')

Brand = {}
Orm.register('brand', 'Brand')

require('./hostname')
require('./office')
require('./checklist')

Brand.get = async id => {
  const brands = await Brand.getAll([id])

  if (brands.length < 1)
    throw new Error.ResourceNotFound(`Brand ${id} not found`)

  return brands[0]
}

Brand.getAll = async ids => {
  const res = await db.query.promise('brand/get', [ids])

  const brands = res.rows

  brands.forEach(brand => {
    const hostname = (brand.hostnames && brand.hostnames.length) ? brand.hostnames[0] : config.webapp.hostname

    brand.base_url = url.format({
      protocol: config.webapp.protocol,
      hostname: hostname,
    })
  })

  return brands
}

Brand.create = async brand => {
  const res = await db.query.promise('brand/insert', [
    brand.parent,
    brand.palette,
    brand.assets,
    brand.messages
  ])

  return Brand.get(res.rows[0].id)
}

Brand.limitAccess = async ({brand, user}) => {
  const has = Brand.hasAccess({
    brand,
    user
  })

  if (!has)
    return new Error.Forbidden('Access denied to brand resource')
}

Brand.isChildOf = async (brand_id, parent, cb) => {
  const res = await db.query.promise('brand/is_child', [
    brand_id,
    parent
  ])

  return Boolean(res.rows[0].is)
}

Brand.getAgents = async (brand, user, limit) => {
  const res = await db.query.promise('brand/agents', [
    brand,
    user,
    limit
  ])

  return res.rows
}

Brand.getUserRoles = async (brand, user) => {
  const res = await db.query.promise('brand/user_roles', [
    brand,
    user
  ])

  return res.rows
}

Brand.hasAccess = async ({brand, user}) => {
  const roles = await Brand.getUserRoles(brand, user)

  // User is not a member of this brand. Definitely has no access.
  if (roles.length < 1)
    return false

  return true
}

Brand.getCurrent = () => {
  if (process.domain && process.domain.brand)
    return process.domain.brand
}

Brand.publicize = model => {
  if (model.palette)
    model.palette.type = 'brand_palette'

  if (model.assets)
    model.assets.type = 'brand_assets'

  if (model.messages)
    model.messages.type = 'brand_messages'

  if (model.tags)
    model.tags.forEach(tag => {
      tag.type = 'brand_tag'
    })
}

Brand.associations = {
  parent: {
    optional: true,
    model: 'Brand'
  }
}