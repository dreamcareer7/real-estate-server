const db = require('../../../utils/db')
const Brand = require('../get')
const { getByBrand } = require('./get')

const set = async setting => {
  const brand = await Brand.get(setting.brand)
  const current = await getByBrand(brand.id)

  current[setting.key] = setting.value

  await db.query.promise('brand/settings/set', [
    brand.id,
    current.enable_open_house_requests,
    current.enable_yard_sign_requests,
    current.enable_liveby,
    current.disable_sensitive_integrations_for_nonagents,
    current.marketing_palette,
    current.theme
  ])
}

module.exports = {
  set
}
