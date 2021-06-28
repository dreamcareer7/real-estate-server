const db = require('../../../../utils/db')

const BrandContext = {
  ...require('./get')
}

BrandContext.create = async context => {
  const id = await db.insert('brand/context/insert', [
    context.brand,
    context.key,
    context.label,
    context.short_label,
    context.order,
    context.section,
    context.needs_approval,
    context.exports,
    context.preffered_source,
    context.default_value,
    context.data_type,
    context.format,
    context.triggers_brokerwolf,
    JSON.stringify(context.checklists)
  ])

  return BrandContext.get(id)
}

BrandContext.update = async context => {
  await db.query.promise('brand/context/update', [
    context.id,
    context.key,
    context.label,
    context.short_label,
    context.order,
    context.section,
    context.needs_approval,
    context.exports,
    context.preffered_source,
    context.default_value,
    context.data_type,
    context.format,
    context.triggers_brokerwolf
  ])

  return BrandContext.get(context.id)
}

BrandContext.setChecklistsForBrand = async (id, checklists, brand) => {
  await db.query.promise('brand/context/set-checklists', [
    id,
    JSON.stringify(checklists),
    brand
  ])

  return BrandContext.get(id)
}

BrandContext.delete = async id => {
  return db.query.promise('brand/context/delete', [id])
}

BrandContext.getByBrand = async brand => {
  const res = await db.query.promise('brand/context/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return BrandContext.getAll(ids)
}

module.exports = BrandContext
