const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')

const config = require('../../config')

const Context = require('../Context')
const Notification = require('../Notification')

class CalendarWorker {
  /**
   *
   * @param {ICalendarNotification} event
   */
  async insertNotificationLog(event) {
    return db.query.promise('calendar/notification/create_log', [
      event.id,
      event.timestamp,
      event.user
    ])
  }

  /**
   * @returns {Promise<ICalendarNotification[]>}
   */
  async getNotificationDueEvents() {
    Context.log(config.calendar.notification_hour)
    return db.select('calendar/notification/now', [
      config.calendar.notification_hour
    ])
  }

  async sendReminderNotifications() {
    const events = await this.getNotificationDueEvents()

    /**
     * @param {ICalendarNotification} event
     * @returns {TNotificationObjectClass}
     */
    function get_subject_class(event) {
      if (event.object_type === 'contact_attribute') return 'ContactAttribute'

      return 'DealContext'
    }

    /**
     * @param {ICalendarNotification} event
     * @returns {TNotificationObjectClass}
     */
    function get_object_class(event) {
      if (event.object_type === 'contact_attribute') return 'Contact'

      return 'Deal'
    }

    for (const event of events) {
      /** @type {INotificationInput} */
      const n = {
        action: 'IsDue',
        subject: event.id,
        subject_class: get_subject_class(event),
        object: event.object_type === 'contact_attribute' ? event.contact : event.deal,
        object_class: get_object_class(event),
        message: '',
        title: event.title
      }

      Context.log(
        '>>> (Calendar::Worker::sendReminderNotifications)',
        `Creating ${n.subject_class}${n.action} notification on event ${
          event.id
        }`
      )

      await promisify(Notification.issueForUser)(n, event.user)
      await this.insertNotificationLog(event)
    }
  }

  async sendEmailForUnread() {

  }

  /**
   * Main worker entry function
   */
  async sendNotifications() {
    await this.sendReminderNotifications()
    await this.sendEmailForUnread()
  }
}

const Model = new CalendarWorker()

module.exports = Model
