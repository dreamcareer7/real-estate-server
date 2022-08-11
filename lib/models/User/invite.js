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
  try {
    Context.log(`try to send activation link to user with email ${user.email}, brand: ${brand_id} link: ${link}`)
    const getSetting = (settings) => {
      let navbarColor
      let logoSrc
      let containerBgColor
      let buttonBgColor
      let buttonTextColor
  
      if (settings && settings.length) {
        const getNavBarColor = (brandSettings) => {
          return brandSettings?.theme?.navbar?.button?.main
        }
        
        const getButtonBGColor = (brandSettings) => {
          return brandSettings?.theme?.palette?.primary?.main
        }

        const getButtonColor = (brandSettings) => {
          return brandSettings?.theme?.palette?.primary?.contrastText
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
    
          if (!buttonBgColor) {
            buttonBgColor = getButtonBGColor(setting)
          }
    
          if (!buttonTextColor) {
            buttonTextColor = getButtonColor(setting)
          }
        }
      }
  
      return {
        navbarColor: navbarColor || '#00b286',
        logoSrc: logoSrc || 'https://assets.rechat.com/daily/logo.png',
        containerBgColor: (containerBgColor || '#fff').trim(),
        buttonBgColor: (buttonBgColor || '#00b286').trim(),
        buttonTextColor: (buttonTextColor || '#fff').trim(),
        buttonFontSize: '14px',
        buttonBorder: 'none',
        buttonFontWeight: '700'
      }
    }
  
    let brandName = 'Rechat'
    let settings
    let brandIds
  
    if (brand_id) {
      const brokerage = await Brand.getParentByType(brand_id, BrandConstant.BROKERAGE)
      brandName = brokerage.name
      const parentIds = await Brand.getParents(brand_id)
      brandIds = [brand_id, ...(parentIds || [])]
    }
  
    if (brandIds && brandIds.length) {
      settings = await BrandSettings.getByBrands(brandIds)
    }
  
    const brandTargetSetting = getSetting(settings)
  
    const html = await promisify(render_template)(TEMPLATE, {
      brandName,
      user,
      link,
      ...brandTargetSetting
    })
  
    
    const data = Buffer.from(html, 'utf-8')
    this.attachment = {
      data,
      filename: 'rendered.html',
      contentType: 'text/html',
      knownLength: data.length,
    }
  
    const finalHtml = juice(html)
  
    const email = await Email.create({
      from: config.email.from,
      to: [user.email],
      html: finalHtml,
      subject: `You've been invited to ${brandName}`
    })
    return email
  } catch(err) {
    Context.error(err)
    throw err
  }
  
}

module.exports = invite
