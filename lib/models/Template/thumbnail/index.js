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
