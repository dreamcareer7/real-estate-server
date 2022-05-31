const path = require('path')
const juice = require('juice')

const promisify = require('../../utils/promisify')
const Mailer = require('../../utils/mailer')
const Brand = require('../Brand/get')
const BrandSettings = require('../Brand/settings/get')

const render_template = require('../../utils/render').mjml

const TEMPLATE = path.resolve(__dirname, '../../mjml/user/invitation.mjml')

class UserMailer extends Mailer {
  get subject() {
    return `You've been invited to ${this.object.brandName}`
  }

  get to() {
    return [this.object.user.email]
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const { user, link, brand_id } = this.object

    //
    const getSetting = (settings) => {
      let navbarColor
      let logoSrc

      const getNavBarColor = (brandSettings) => {
        return brandSettings?.theme?.navbar?.button?.main
      }

      const getLogoSrc = (brandSettings) => {
        return brandSettings?.marketing_palette?.['container-logo-wide']
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
        navbarColor,
        logoSrc,
      }
    }

    const defaultNavBarColor = '#00b286'
    const defaultLogoSrc = 'https://rechat.com/wp-content/themes/rechat/assets/images/logo.svg'
    const defaultBrandName = 'Rechat'

    let brandName = defaultBrandName
    let navbarColor = defaultNavBarColor
    let logoSrc = defaultLogoSrc

    if (brand_id) {
      const brokerage = await Brand.getFirstBrokerageInBrandHierarchy(brand_id)
      brandName = brokerage.name
      const parentIds = await Brand.getParents(brand_id)
      const settings = await BrandSettings.getByBrands([brand_id, ...(parentIds || [])])
      const brandTargetSetting = getSetting(settings)
      navbarColor = brandTargetSetting.navbarColor
      logoSrc = brandTargetSetting.logoSrc
    }
   
    //
    // /** @type {string} */
    // const link = await User.getActivationLink({ user, agent: null })

    const html = await promisify(render_template)(TEMPLATE, {
      brandName,
      navbarColor,
      logoSrc,
      user,
      link,
    })

    const data = Buffer.from(html, 'utf-8')
    this.attachment = {
      data,
      filename: 'rendered.html',
      contentType: 'text/html',
      knownLength: data.length,
    }

    return juice(html)
  }
}

module.exports = UserMailer
