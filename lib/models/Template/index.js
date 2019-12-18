const db = require('../../utils/db')

Template = {}

require('./instance')
require('./asset')
require('./thumbnail')

Orm.register('template', 'Template')

Template.create = async ({name, variant, inputs, brands = [], template_type, medium}) => {
  const res = await db.query.promise('template/insert', [
    name,
    variant,
    template_type,
    medium,
    inputs,
  ])

  const id = res.rows[0].id

  for(const brand of brands)
    await Template.allow(id, brand)

  return Template.get(id)
}

Template.get = async id => {
  const templates = await Template.getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Template ${id} not found`)

  return templates[0]
}

Template.getAll = async ids => {
  const res = await db.query.promise('template/get', [ids])
  return res.rows
}

Template.getForBrand = async ({types, mediums, brand}) => {
  const res = await db.query.promise('template/for-brand', [brand, types, mediums])
  const ids = res.rows.map(r => r.id)

  return Template.getAll(ids)
}

Template.allow = async (template_id, brand_id) => {
  return db.query.promise('template/brands/allow', [
    template_id,
    brand_id
  ])
}
