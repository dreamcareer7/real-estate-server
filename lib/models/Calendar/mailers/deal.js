const path = require('path')
const juice = require('juice')

const promisify = require('../../../utils/promisify')
const Mailer = require('../../../utils/mailer')
const render_template = require('../../../utils/render').html

const Branch = require('../../Branch')
const { Listing } = require('../../Listing')
const Url = require('../../Url')

const BRANCH_ACTION = 'RedirectToContact'

/**
 * Creates a Branch link for the task
 * @param {UUID} task_id Main task id
 * @param {UUID} user_id User receiving the notification
 * @param {string} email User's email
 */
async function getBranchLink(task_id, brand_id, user_id, email) {
  const url = Url.web({
    uri: '/branch'
  })

  return promisify(Branch.createURL)({
    action: BRANCH_ACTION,
    receiving_user: user_id,
    brand_id,
    email: email,
    crm_task: task_id,
    $desktop_url: url,
    $fallback_url: url
  })
}

class DealMailer extends Mailer {
  get subject() {
    return 'Upcoming Rechat Event'
  }

  get to() {
    return this.object.user.email
  }

  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    const deal = this.object.deal
    const context = this.object.context

    /** @type {INotification} */
    const notification = this.object.notification

    /** @type {IUser} */
    const user = this.object.user

    let listing

    if (deal.listing) {
      listing = await promisify(Listing.get)(deal.listing)
    }

    /** @type {string} */
    const link = await getBranchLink(
      deal.id,
      deal.brand,
      user.id,
      user.email
    )

    const LAYOUT_PATH = path.resolve(
      __dirname,
      '../../../html/calendar/deal.html'
    )

    const html = await promisify(render_template)(LAYOUT_PATH, {
      user,

      link,
      due_date: context.date,
      reminder: notification.data.reminder,

      critical_date: context.definition.label,
      full_address: Deal.getContext(deal, 'full_address'),
      street_address: Deal.getContext(deal, 'street_address'),
      listing: listing,
      price: Deal.getContext(deal, 'list_price'),
      picture: Deal.getContext(deal, 'photo'),
    })

    return juice(html)
  }
}

module.exports = DealMailer
