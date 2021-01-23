const { EventEmitter } = require('events')

const db = require('../../utils/db.js')

const Brand = {
  ...require('./get'),
  ...require('./access'),
  ...require('./constants'),
}

const emitter = new EventEmitter
Brand.on = emitter.on.bind(emitter)

require('./flow')
require('./event')
require('./list')

require('./deal/status')
require('./deal/context')
require('./deal/checklist')


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

Brand.isSubMember = async (brand, user) => {
  const { is } = await db.selectOne('brand/is_sub_member', [brand, user])
  return Boolean(is)
}

module.exports = Brand

Object.assign(Brand, {
  ...require('./default')
})
