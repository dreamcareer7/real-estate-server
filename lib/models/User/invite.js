const path = require('path')
const juice = require('juice')
const config = require('../../config.js')
const promisify = require('../../utils/promisify')
const Brand = require('../Brand/get')
const BrandSettings = require('../Brand/settings/get')
const BrandConstant = require('../Brand/constants')
const render_template = require('../../utils/render').mjml
const Email = require('../Email/create')
const Context  = require('../Context')
const TEMPLATE = path.resolve(__dirname, '../../mjml/user/invitation.mjml')

const invite = async (user, brand_id, link) => {
  Context.log(`try to send activation link to user with email ${user.email}, brand: ${brand_id} link: ${link}`)
  const getSetting = (settings) => {
    let navbarColor
    let logoSrc
    let containerBgColor

    const getNavBarColor = (brandSettings) => {
      return brandSettings?.theme?.navbar?.button?.main
    }


    const getKeyFromPalette = (brandSettings, key) => {
      return brandSettings?.marketing_palette?.[key]
    }

    for (let index = 0; index < settings.length; index++) {
      const setting = settings[index]
      if (!navbarColor) {
        navbarColor = getNavBarColor(setting)
      }
      
      if (!logoSrc) {
        logoSrc = getKeyFromPalette(setting, 'container-logo-wide')
      }

      if (!containerBgColor){
        containerBgColor = getKeyFromPalette(setting, 'container-bg-color')
      }
    }

    return {
      navbarColor,
      logoSrc,
      containerBgColor
    }
  }

  const defaultNavBarColor = '#00b286'
  const defaultLogoSrc = 'https://assets.rechat.com/daily/logo.png'
  const defaultBrandName = 'Rechat'
  const defaultContainerBgColor = '#fff'
  let brandName
  let navbarColor
  let logoSrc
  let containerBgColor

  if (brand_id) {
    const brokerage = await Brand.getParentByType(brand_id, BrandConstant.BROKERAGE)
    brandName = brokerage.name
    const parentIds = await Brand.getParents(brand_id)
    const settings = await BrandSettings.getByBrands([brand_id, ...(parentIds || [])])
    const brandTargetSetting = getSetting(settings)
    navbarColor = brandTargetSetting.navbarColor
    logoSrc = brandTargetSetting.logoSrc
    containerBgColor = brandTargetSetting.containerBgColor
  }

  brandName = brandName || defaultBrandName
  navbarColor = navbarColor || defaultNavBarColor
  logoSrc = logoSrc || defaultLogoSrc
  containerBgColor = containerBgColor || defaultContainerBgColor

  Context.log(`before sending the email brandName: ${brandName} navbarColor: ${navbarColor}, logoSrc: ${logoSrc}`)

  const html = await promisify(render_template)(TEMPLATE, {
    brandName,
    navbarColor,
    logoSrc,
    user,
    link,
    containerBgColor
  })

  Context.log('html is rendered')
  const data = Buffer.from(html, 'utf-8')
  this.attachment = {
    data,
    filename: 'rendered.html',
    contentType: 'text/html',
    knownLength: data.length,
  }

  const finalHtml = juice(html)

  Context.log('email is creating')
  const email = await Email.create({
    from: config.email.from,
    to: [user.email],
    html: finalHtml,
    subject: `You've been invited to ${brandName}`
  })
  Context.log('email is created')
  return email
}

module.exports = invite
