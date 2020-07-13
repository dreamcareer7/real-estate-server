const url = require('url')
const { EventEmitter } = require('events')
const _ = require('lodash')

const db = require('../../utils/db.js')
const config = require('../../config.js')
const Context = require('../Context/index')
const Orm = {
  ...require('../Orm/registry'),
  ...require('../Orm/index'),
}

const Brand = {}

const emitter = new EventEmitter
Brand.on = emitter.on.bind(emitter)

require('./user')
require('./flow')
require('./event')
require('./email')
require('./asset')
require('./template')
require('./role')
require('./list')

require('./deal/status')
require('./deal/context')
require('./deal/checklist')

const UserRole = require('../User/role')

// Brand types
Brand.BROKERAGE = 'Brokerage'
Brand.OFFICE = 'Office'
Brand.TEAM = 'Team'
Brand.PERSONAL = 'Personal'
Brand.OTHER = 'Other'

Brand.get = async id => {
  const brands = await Brand.getAll([id])

  if (brands.length < 1)
    throw Error.ResourceNotFound(`Brand ${id} not found`)

  return brands[0]
}

Brand.getAll = async ids => {
  const associations = Orm.getEnabledAssociations()

  const res = await db.query.promise('brand/get', [ids, associations])
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
  const id = await db.insert('brand/insert', [
    brand.name,
    brand.parent,
    brand.brand_type,
    brand.palette,
    brand.assets,
    brand.messages
  ])

  const added = await Brand.get(id)

  const listeners = emitter.listeners('create')
  for(const listener of listeners)
    await listener(added)

  return added
}

Brand.update = async brand => {
  await db.query.promise('brand/update', [
    brand.id,
    brand.name,
    brand.palette,
    brand.assets,
    brand.messages,
    brand.brand_type
  ])

  return Brand.get(brand.id)
}

Brand.delete = async id => {
  return db.query.promise('brand/delete', [id])
}

Brand.getAgents = async (brand) => {
  const res = await db.query.promise('brand/agents', [
    brand
  ])

  return res.rows
}

Brand.proposeAgents = async (brand, user) => {
  const { rows } = await db.query.promise('brand/propose', [
    brand,
    user
  ])

  return rows
}

/**
 * @returns {IBrand=}
 */
Brand.getCurrent = () => {
  return Context.get('brand')
}

Brand.getByParent = async parent => {
  const res = await db.query.promise('brand/by_parent', [parent])
  return Brand.getAll(res.rows.map(r => r.id))
}

Brand.getParents = async brand_id => {
  const res = await db.query.promise('brand/get_parents', [brand_id])
  return res.rows.map(r => r.parent)
}

Brand.isTraining = async id => {
  const row = await db.selectOne('brand/is_training', [id])
  return Boolean(row.is)
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

/**
 * @param {{brand: UUID; user: UUID; roles?: string[]}} arg1
 */
Brand.limitAccess = async ({brand, user, roles}) => {
  const brands_access = await Brand.hasAccessToBrands([brand], user, roles)

  if (!brands_access[brand])
    throw Error.Forbidden('Access denied to brand resource')
}

/**
 * Checks whether a user has access to a number of brands
 * @param {Iterable<UUID>} brands
 * @param {UUID} user
 */
Brand.hasAccessToBrands = async (brands, user, acl) => {
  const user_access = await UserRole.getForUser(user)
  const indexed = _.keyBy(user_access, 'brand')

  const access = {}
  for(const brand_id of brands) {
    const user_brand_acess = indexed[brand_id]

    // User has nothing to do with this brand. Not a member.
    if (!user_brand_acess) {
      access[brand_id] = false
      continue
    }

    // User is a member and we don't care about any specific ACL
    if (!acl || acl.length === 0) {
      access[brand_id] = true
    }

    // User is a member and we care about a specific ACL list
    access[brand_id] = _.difference(acl, user_brand_acess.acl).length === 0
  }

  return access
}

Brand.isSubMember = async (brand, user) => {
  const { is } = await db.selectOne('brand/is_sub_member', [brand, user])
  return Boolean(is)
}

Brand.associations = {
  roles: {
    collection: true,
    model: 'BrandRole',
    enabled: false
  },

  parent: {
    optional: true,
    model: 'Brand'
  },

  children: {
    collection: true,
    model: 'Brand',
    enabled: false
  }
}

Orm.register('brand', 'Brand', Brand)
module.exports = Brand
