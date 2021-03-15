const db = require('../../../utils/db')
const Brand = require('../get')
const { getByBrand } = require('./get')

const set = async setting => {
  const brand = await Brand.get(setting.brand)
  const current = await getByBrand(brand.id)

  current[setting.key] = setting.value

  await db.query.promise('brand/settings/set', [
    brand.id,
    current.enable_open_houses,
    current.enable_yard_signs,
    current.enable_liveby,
    current.disable_sensitive_integrations_for_nonagents,
    current.marketing_palette,
    current.ui_palette
  ])
}

module.exports = {
  set
}
