const db = require('../../utils/db')
const Orm = require('../Orm')
const sq = require('../../utils/squel_extensions')

BrandContext = {}

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

BrandContext.createAll = async contexts => {
  const defaults = {
    brand: null,
    key: null,
    label: null,
    short_label: null,
    order: null,
    section: null,
    needs_approval: null,
    exports: null,
    preffered_source: null,
    default_value: null,
    data_type: null,
    format: null,
    required: null,
    optional: null,
    triggers_brokerwolf: null,
  }

  const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
    .into('brands_contexts')
    .setFieldsRows(contexts.map(c => ({...defaults, ...c})))

  // @ts-ignore
  q.name = 'brand/context/create_all'

  return db.query.promise(q, [])
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

BrandContext.getByBrand = async brand => {
  const res = await db.query.promise('brand/context/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return BrandContext.getAll(ids)
}

Orm.register('brand_context', 'BrandContext')

module.exports = BrandContext
