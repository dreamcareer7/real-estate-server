const db = require('../../utils/db')

const BrandTemplate = {}

Orm.register('brand_template', 'BrandTemplate', BrandTemplate)

BrandTemplate.get = async id => {
  const templates = await BrandTemplate.getAll([id])

  if (templates.length < 1)
    throw new Error.ResourceNotFound(`Brand template ${id} not found`)

  return templates[0]
}

BrandTemplate.getAll = async ids => {
  const { rows } = await db.query.promise('template/brand/get', [ids])
  return rows
}

BrandTemplate.getForBrand = async ({types, mediums, brand}) => {
  const res = await db.query.promise('template/brand/for-brand', [brand, types, mediums])
  const ids = res.rows.map(r => r.id)

  return BrandTemplate.getAll(ids)
}

BrandTemplate.allow = async (template_id, brand_id) => {
  return db.query.promise('template/brand/allow', [
    template_id,
    brand_id
  ])
}

BrandTemplate.updateThumbnails = async ({template, brand, thumbnail, preview}) => {
  return db.query.promise('template/brand/update-thumbnails', [
    template.id,
    brand.id,
    thumbnail.id,
    preview.id
  ])
}

BrandTemplate.associations = {
  template: {
    model: 'Template',
    enabled: true
  },

  thumbnail: {
    model: 'AttachedFile',
    optional: true,
    enabled: true
  },

  preview: {
    model: 'AttachedFile',
    optional: true
    enabled: true
  }
}

module.exports = BrandTemplate
