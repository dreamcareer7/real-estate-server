const path = require('path')
const juice = require('juice')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')

const Branch = require('../../Branch')
const Url = require('../../Url')
const render_template = require('../../../utils/render').html

const BRANCH_ACTION = 'RedirectToContact'

/**
 * Creates a Branch link for the task
 * @param {UUID} contact_id Main task id
 * @param {UUID} user_id User receiving the notification
 * @param {string} email User's email
 */
async function getBranchLink(contact_id, brand_id, user_id, email) {
  const url = Url.web({
    uri: '/branch'
  })

  return Branch.createURL({
    action: BRANCH_ACTION,
    receiving_user: user_id,
    brand_id,
    email: email,
    contact: contact_id,
    $desktop_url: url,
    $fallback_url: url
  })
}

class ContactMailer extends Mailer {
  get subject() {
    return 'Upcoming Rechat Event'
  }

  get to() {
    return this.object.user.email
  }

  /** @returns {IContact} */
  get contact() {
    return this.object.contact
  }

  get display_name() {
    /** @type {IContactAttribute} */
    const attribute = this.object.attribute
    const { partner_name, display_name } = this.contact

    if (attribute.is_partner) {
      if (partner_name && partner_name.length > 0) {
        return partner_name
      }

      return `${display_name}'s spouse`
    }

    return display_name
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const contact = this.contact

    /** @type {IContactAttribute} */
    const attribute = this.object.attribute

    /** @type {INotification} */
    const notification = this.object.notification

    /** @type {IUser} */
    const user = this.object.user

    /** @type {string} */
    const link = await getBranchLink(
      contact.id,
      contact.brand,
      user.id,
      user.email
    )

    const LAYOUT_PATH = path.resolve(
      __dirname,
      '../../../html/calendar/contact.html'
    )

    const html = await promisify(render_template)(LAYOUT_PATH, {
      user,

      picture: 'https://i.ibb.co/Dp0B1xF/oh-registration-page-3x.png',
      link,
      event_title: notification.data.type_label,
      reminder: notification.data.reminder,
      display_name: this.display_name,
      due_date: attribute.date
    })

    return juice(html)
  }
}

module.exports = ContactMailer
