const config = require('../../../config')
const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

const Branch = require('../../Branch')
const Email = require('../../Email')
const Notification = require('../../Notification')
const Orm = require('../../Orm')
const Url = require('../../Url')

const BRANCH_ACTION = 'RedirectToCRMTask'

/**
 * Fetch all unread notifications related to tasks
 * @private
 * @returns {Promise<INotification[]>}
 */
async function getUnreadNotifications() {
  const models = await db.select('crm/task/unread', [
    config.email.seamless_delay
  ])
  return Orm.populate({ models })
}

async function getBranchLink(task_id, user_id, email) {
  const url = Url.web({
    uri: '/branch'
  })

  return promisify(Branch.createURL)({
    action: BRANCH_ACTION,
    receiving_user: user_id,
    email: email,
    $desktop_url: url,
    $fallback_url: url
  })
}

/**
 * Renders email html
 * @private
 * @param {INotification} unread_notification 
 * @returns {Promise<string>}
 */
async function render(unread_notification) {
  /** @type {string} */
  const branch_link = await getBranchLink()
  return branch_link
}

/**
 * Send an email to a user
 * @private
 * @param {IUser} user Recipient of the email
 * @param {string} html Email's HTML content
 */
async function send(user, html) {
  const subject = 'New messages on Rechat'

  const mailgun_options = {
    'h:List-Unsubscribe': '<%unsubscribe_email%>'
  }

  return await promisify(Email.sendSane)({
    from: 'Rechat <' + config.email.from + '>',
    to: [ user.email ],
    subject,
    mailgun_options,
    html: html
  })
}

class TaskMailer {
  /**
   * Sends an email for unread task notifications
   */
  static async sendEmailForUnread() {
    const unread_task_notifications = await getUnreadNotifications()

    for (const n of unread_task_notifications) {
      const html = await render(n)
      await send(n.subject, html)
      await promisify(Notification.saveDelivery)(n.id, n.object.id, n.subject.email, 'email')
    }
  }
}

module.exports = TaskMailer
