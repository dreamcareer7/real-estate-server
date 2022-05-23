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
  const parentIds = await Brand.getParents(brand_id)
  const settings = await BrandSettings.getByBrands([brand_id, ...(parentIds || [])])

  const getSetting = async (settings) => {
    const defaultNavBarColor = '#00b286'
    const defaultLogoSrc = '' // TODO put a default logo here

    let navbarColor
    let logoSrc
    //
    const getNavBarColor = (brandSettings) => {
      return brandSettings?.theme?.navbar?.button?.main
    }

    const getLogoSrc = (brandSettings) => {
      return brandSettings?.marketing_palette?.container?.logo.wide
    }

    for (let index = 0; index < settings.length; index++) {
      const setting = settings[index]
      if (!navbarColor) {
        navbarColor = getNavBarColor(setting)
      }
      if (!logoSrc) {
        logoSrc = getLogoSrc(setting)
      }
    }
    
    return {
      navbarColor: navbarColor || defaultNavBarColor,
      logoSrc: logoSrc || defaultLogoSrc
    }
  }
  
  const {
    navbarColor,
    logoSrc
  } = await getSetting(settings)

  const mailer = new Mailer({
    brand,
    navbarColor,
    logoSrc,
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
