const db = require('../../../utils/db')
const Orm = require('../../Orm')

const BrandContext = {}

BrandContext.get = async id => {
  const contexts = await BrandContext.getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Brand Context ${id} not found`)

  return contexts[0]
}

BrandContext.getAll = async ids => {
  const res = await db.query.promise('brand/context/get', [ids])
  return res.rows
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
    context.required,
    context.optional,
    context.triggers_brokerwolf,
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
    context.required,
    context.optional,
    context.triggers_brokerwolf,
  ])

  return BrandContext.get(context.id)
}

BrandContext.delete = async id => {
  return db.query.promise('brand/context/delete', [id])
}

BrandContext.getByBrand = async brand => {
  const res = await db.query.promise('brand/context/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return BrandContext.getAll(ids)
}

Orm.register('brand_context', 'BrandContext', BrandContext)

module.exports = BrandContext
