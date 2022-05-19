const BrandRole = require('../role/get')
const BrandUser = {
  ...require('./update'),
  ...require('./get')
}
const Brand = require('../get')
const BrandSettings = require('../settings/get')
const User = require('../../User/get')
const Mailer = require('./mailer')

/**
 * @param {UUID} brand_id
 * @param {UUID} user_id
 */
async function inviteMember(brand_id, user_id) {
  const user = await User.get(user_id)
  const user_type = User.getLogicalType(user)
  if (user_type !== 'EmailShadowUser') {
    throw Error.Validation('User needs to be an email shadow user.')
  }

  const brand = await Brand.get(brand_id)
  const settings = await BrandSettings.getByBrand(brand_id)
  
  const mailer = new Mailer({
    brand,
    theme: settings.theme,
    palette: settings.marketing_palette,
    user,
  })
  await mailer.send()
  
  await updateLastInvited(brand.id, user_id)
}

async function updateLastInvited(brand, user) {
  const roles = await BrandRole.getByUser(brand, user)
  for (const role of roles) {
    const brand_user = await BrandUser.getByRoleAndUser(role, user)
    await BrandUser.updateLastInvited(brand_user)
  }
}

module.exports = {
  inviteMember,
}
