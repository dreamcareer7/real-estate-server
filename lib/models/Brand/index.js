const { EventEmitter } = require('events')
const _ = require('lodash')

const db = require('../../utils/db.js')

const Brand = {
  ...require('./get')
}

const emitter = new EventEmitter
Brand.on = emitter.on.bind(emitter)

require('./user')
require('./flow')
require('./event')
require('./email')
require('./asset')
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

Brand.isTraining = async id => {
  const row = await db.selectOne('brand/is_training', [id])
  return Boolean(row.is)
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

module.exports = Brand
