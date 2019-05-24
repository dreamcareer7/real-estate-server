const url = require('url')
const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const config = require('../../config.js')
const Orm = require('../Orm')
const Context = require('../Context/index')

const Brand = {}
global['Brand'] = Brand

require('./hostname')
require('./office')
require('./checklist')
require('./role')
require('./template')
require('./context')
require('./email')

const emitter = new EventEmitter
Brand.on = emitter.on.bind(emitter)

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

  emitter.emit('create', added)

  return added
}

Brand.update = async brand => {
  await db.query.promise('brand/update', [
    brand.id,
    brand.name,
    brand.palette,
    brand.assets,
    brand.messages
  ])

  return Brand.get(brand.id)
}

Brand.delete = async id => {
  return db.query.promise('brand/delete', [id])
}

Brand.getAgents = async brand => {
  const res = await db.query.promise('brand/agents', [
    brand,
  ])

  return res.rows
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
