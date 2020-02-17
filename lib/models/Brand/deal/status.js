const db = require('../../../utils/db')
const Orm = require('../../Orm')

const BrandDealStatus = {}

BrandDealStatus.get = async id => {
  const contexts = await BrandDealStatus.getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Brand Deal Status ${id} not found`)

  return contexts[0]
}

BrandDealStatus.getAll = async ids => {
  const res = await db.query.promise('brand/deal/status/get', [ids])
  return res.rows
}

BrandDealStatus.create = async context => {
  const id = await db.insert('brand/deal/status/insert', [
    context.brand,
    context.label,
    context.deal_types,
    context.property_types,
    context.color,
    context.admin_only,
  ])

  return BrandDealStatus.get(id)
}

BrandDealStatus.update = async context => {
  await db.query.promise('brand/deal/status/update', [
    context.id,
    context.label,
    context.deal_types,
    context.property_types,
    context.color,
    context.admin_only,
  ])

  return BrandDealStatus.get(context.id)
}

BrandDealStatus.delete = async id => {
  return db.query.promise('brand/deal/status/delete', [id])
}

BrandDealStatus.getByBrand = async brand => {
  const res = await db.query.promise('brand/deal/status/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return BrandDealStatus.getAll(ids)
}

Orm.register('brand_deal_status', 'BrandDealStatus', BrandDealStatus)

module.exports = BrandDealStatus
