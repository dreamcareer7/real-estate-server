const db = require('../../../../utils/db')

const BrandDealStatus = {
  ...require('./get')
}

BrandDealStatus.create = async context => {
  const id = await db.insert('brand/deal/status/insert', [
    context.brand,
    context.label,
    context.admin_only,
    Boolean(context.is_archived),
    Boolean(context.is_active),
    Boolean(context.is_pending),
    Boolean(context.is_closed),
    context.checklists
  ])

  return BrandDealStatus.get(id)
}

BrandDealStatus.update = async (brand, context) => {
  await db.query.promise('brand/deal/status/update', [
    context.id,
    context.label,
    context.admin_only,
    Boolean(context.is_archived),
    Boolean(context.is_active),
    Boolean(context.is_pending),
    Boolean(context.is_closed),
    context.checklists,
    brand
  ])

  return BrandDealStatus.get(context.id)
}

BrandDealStatus.delete = async id => {
  return db.query.promise('brand/deal/status/delete', [id])
}

module.exports = BrandDealStatus
