const path = require('path')
const { mjml } = require('../../../utils/render')
const Mailer = require('../../../utils/mailer')
const promisify = require('../../../utils/promisify')
const Url = require('../../Url')
const Branch = require('../../Branch')

const TEMPLATE = path.resolve('../../../mjml/contact/lead_capture.mjml')
const BRANCH_ACTION = 'RedirectToCRMTask'

module.exports = class extends Mailer {
  /**
   * Creates a Branch link for the contact
   * @param {UUID} contact
   * @param {UUID} user User receiving the notification
   * @param {UUID} brand
   * @param {string} email User's email
   * @returns {Promise<string>}
   */
  async getBranchLink(contact, user, brand, email) {
    const url = Url.web({
      uri: '/branch',
    })

    return Branch.createURL({
      action: BRANCH_ACTION,
      receiving_user: user,
      brand_id: brand,
      email: email,
      contact: contact,
      $desktop_url: url,
      $fallback_url: url,
    })
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const now = Date.now() / 1000
    const { contact, user, ...rest } = this.object
    const profile_url = await this.getBranchLink(
      contact.id,
      user.id,
      contact.brand,
      user.email
    )
    return promisify(mjml)(TEMPLATE, {
      address: rest.address,
      message: rest.message,
      display_name: contact.display_name,
      timestamp: now,
      timezone: user.timezone,
      suggested_action_timestamp: now + 5 * 60,
      email: rest.email,
      phone_number: rest.phone_number,
      profile_url,
    })
  }
}
