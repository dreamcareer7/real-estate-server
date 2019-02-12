const _ = require('lodash')

const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')
// eslint-disable-next-line no-unused-vars
const Mailer = require('../../utils/mailer')

const config = require('../../config')

const Context = require('../Context')
const Notification = require('../Notification')
const Orm = require('../Orm')

const ContactMailer = require('./mailers/contact')
const DealMailer = require('./mailers/deal')

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
    Context.log(events)

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
        data: {
          type_label: event.type_label,
          reminder: event.reminder
        },
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

  async getUnreadNotifications() {
    const models = await db.select('calendar/notification/unread', [
      config.email.seamless_delay
    ])

    const notifications_by_user = _.groupBy(models, 'subject')
    const original_user = Context.get('user')

    let populated = []
    for (const [user_id, notifications] of Object.entries(notifications_by_user)) {
      Context.set({
        user: { id: user_id }
      })

      populated = populated.concat(await Orm.populate({
        models: notifications,
        associations: [
          'contact.summary',
          'contact_attribute.attribute_def',
          'deal_context_item.definition'
        ]
      }))
    }

    Context.set({user: original_user})

    return populated  
  }

  createMailer(n) {
    /** @type {Mailer} */
    let mailer

    /** @type {IUser} */
    const user = n.auxiliary_subject

    if (n.object_class === 'Contact') {
      /** @type {IContact} */
      const contact = n.objects[0]
      const attribute = n.subjects[0]

      mailer = new ContactMailer({ user, contact, attribute, notification: n })
    }
    else {
      const deal = n.objects[0]
      const context = n.subjects[0]
      mailer = new DealMailer({ user, deal, context, notification: n })
    }

    return mailer
  }

  async sendEmailForUnread() {
    const unread_notifications = await this.getUnreadNotifications()

    for (const n of unread_notifications) {
      /** @type {IUser} */
      const user = n.auxiliary_subject
      const mailer = this.createMailer(n)
      await mailer.send()
      await promisify(Notification.saveDelivery)(n.id, user.id, user.email, 'email')
    }
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
