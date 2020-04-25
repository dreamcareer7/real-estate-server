const db = require('../../../utils/db')
const BrandTemplate = require('../brand')

Template.generateThumbnails = async template => {
  const { rows } = await db.query.promise('template/thumbnail/allowed-brands', [
    template.id
  ])

  const ids = rows.map(r => r.brand)
  const brand_templates = await BrandTemplate.getAll(ids)

  for(const brand_template of brand_templates)
    await BrandTemplate.generateThumbnail(brand_template)
}

const markAsValid = async id => {
  return db.query.promise('template/thumbnail/validate', [id])
}

Template.updateThumbnails = async () => {
  const { rows } = await db.query.promise('template/thumbnail/get-invalids', [])

  const promises = []

  for(const row of rows) {
    const { id } = row
    const brand_template = await BrandTemplate.get(id)

    promises.push(BrandTemplate.generateThumbnail(brand_template))
    promises.push(markAsValid(id))
  }

  return Promise.all(promises)
}

Template.invalidateForBrand = brand_id => {
  return db.query.promise('template/thumbnail/invalidate-brand', [
    brand_id
  ])
}
