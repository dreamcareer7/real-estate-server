const BrandRole = require('../role/get')
const BrandUser = require('./update')
const Brand = require('../get')
const BrandSettings = require('../settings/get')
const User = require('../../User/get')
const Mailer = require('./mailer')

/**
 * @param {UUID} brand_id
 * @param {UUID} user_id
 */
async function inviteMembers(brand_id, role_id, user_id) {
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

  await updateLastInvited(brand, user_id)
}

async function updateLastInvited(brand, user) {
  BrandRole.getByUser(brand, user)
}

module.exports = {
  inviteMembers,
}
