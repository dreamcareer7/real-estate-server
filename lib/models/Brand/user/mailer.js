const path = require('path')
const juice = require('juice')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')
const User = require('../../User/create')

const render_template = require('../../../utils/render').mjml

const TEMPLATE = path.resolve(__dirname, '../../../mjml/user/invitation.mjml')

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
    const { user } = this.object

    /** @type {string} */
    const link = await User.getActivationLink({ user, agent: null })

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
