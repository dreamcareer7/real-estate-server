const config = require('../../../config')
const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

const Email = require('../../Email')
const Orm = require('../../Orm')

Orm.register('unread_task_notification', 'UnreadTaskNotification', {
  associations: {
    notification: {
      model: 'Notification',
      enabled: true
    },
    task: {
      model: 'CrmTask',
      enabled: true
    },
    user: {
      model: 'User',
      enabled: true
    }
  }
})

class TaskMailer {
  /**
   * Fetch all unread notifications related to tasks
   * @private
   * @returns {Promise<IUnreadTaskNotification[]>}
   */
  static async getUnreadNotifications() {
    const models = await db.select('crm/task/unread', [
      config.email.seamless_delay
    ])
    return Orm.populate({ models })
  }

  /**
   * Renders email html
   * @private
   * @param {IUnreadTaskNotification} unread_notification 
   * @returns {string}
   */
  static render(unread_notification) {
    return ''
  }

  /**
   * Send an email to a user
   * @private
   * @param {IUser} user Recipient of the email
   * @param {string} html Email's HTML content
   */
  static async sendUnreadNotificationEmail(user, html) {
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

  /**
   * Sends an email for unread task notifications
   */
  static async sendEmailForUnread() {
    const unread_task_notifications = await TaskMailer.getUnreadNotifications()

    for (const n of unread_task_notifications) {
      const html = TaskMailer.render(n)
      await TaskMailer.sendUnreadNotificationEmail(n.user, html)
      await promisify(Notification.saveDelivery)(n.notification, n.user.id, n.user.email, 'email')
    }
  }
}

module.exports = TaskMailer
