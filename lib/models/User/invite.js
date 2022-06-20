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
      let buttonFontSize
      let buttonFontWeight
      let buttonBorder
  
      if (settings && settings.length) {
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
    
          if (!buttonBgColor) {
            buttonBgColor = getKeyFromPalette(setting, 'button-bg-color')
          }
    
          if (!buttonTextColor) {
            buttonTextColor = getKeyFromPalette(setting, 'button-text-color')
          }
    
          if (!buttonFontSize) {
            buttonFontSize = getKeyFromPalette(setting, 'button-font-size')
          }
    
          if (!buttonFontWeight) {
            buttonFontWeight = getKeyFromPalette(setting, 'button-font-weight')
          }
          
          if (!buttonBorder) {
            buttonBorder = getKeyFromPalette(setting, 'button-border')
          }
    
        }
      }
  
      return {
        navbarColor: navbarColor || '#00b286',
        logoSrc: logoSrc || 'https://assets.rechat.com/daily/logo.png',
        containerBgColor: (containerBgColor || '#fff').trim(),
        buttonBgColor: (buttonBgColor || '#00b286').trim(),
        buttonTextColor: (buttonTextColor || '#fff').trim(),
        buttonFontSize: (buttonFontSize || '14px').trim(),
        buttonBorder: (buttonBorder || 'none').trim(),
        buttonFontWeight: (buttonFontWeight || '700').trim()
      }
    }
  
    let brandName = 'Rechat'
    let settings
    let brandIds
  
    if (brand_id) {
      const brokerage = await Brand.getParentByType(brand_id, BrandConstant.BROKERAGE)
      brandName = brokerage.name
      const parentIds = await Brand.getParents(brand_id)
      Context.log(`debug invitation1 ${JSON.stringify(parentIds)}`)
      brandIds = [brand_id, ...(parentIds || [])]
      Context.log(`debug invitation2 ${JSON.stringify(brandIds)}`)
    }
  
    if (brandIds && brandIds.length) {
      settings = await BrandSettings.getByBrands(brandIds)
    }
    
    Context.log(`debug invitation3 ${JSON.stringify(settings)}`)
  
    const brandTargetSetting = getSetting(settings)
  
    const html = await promisify(render_template)(TEMPLATE, {
      brandName,
      user,
      link,
      ...brandTargetSetting
    })
  
    Context.log('debug invitation4')
    
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
  } catch(err) {
    Context.error(err)
    throw err
  }
  
}

module.exports = invite
