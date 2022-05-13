const path = require('path')
const moment = require('moment-timezone')
const juice = require('juice')
const snake = require('to-snake-case')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const Url = require('../../Url')
const render_template = require('../../../utils/render').mjml

const BRANCH_ACTION = 'RedirectToCRMTask'
const TEMPLATE = path.resolve(__dirname, '../../../mjml/user/invitation.mjml')

async function getBranchLink(user, brand) {
  const url = Url.web({
    uri: '/branch',
  })

  return Branch.createURL({
    action: BRANCH_ACTION,
    receiving_user: user.id,
    brand: brand.id,
    email: user.email,
    userInfo: user,
    $desktop_url: url,
    $fallback_url: url,
  })
}

class UserMailer extends Mailer {
  get subject() {
    return `You've been invited to ${this.object.brand.name}`
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
    const { user, brand, theme, palette } = this.object

    /** @type {string} */
    const link = await getBranchLink()

    const html = await promisify(render_template)(TEMPLATE, {
      ...this.object,
      link
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
