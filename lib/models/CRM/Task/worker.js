const _ = require('lodash')

const config = require('../../../config')
const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

const Context = require('../../Context')
const Notification = require('../../Notification')
const Orm = require('../../Orm')

const Reminder = require('./reminder')
const Task = require('./index')
const TaskMailer = require('./mailer')

/**
 * Creates notifications for reminders that are due now.
 * Used in workers.
 * @internal
 */
async function sendReminderNotifications() {
  const ids = await db.selectIds('crm/reminder/now', [])
  const reminders = await Reminder.getAll(ids)
  const tasks = await Task.getAll(reminders.map(r => r.task), true)
  const taskIndex = _.keyBy(tasks, 'id')

  for (const reminder of reminders) {
    const task = taskIndex[reminder.task]

    if (task) {
      /** @type {INotificationInput} */
      const n = {
        action: 'IsDue',
        subject: reminder.id,
        subject_class: 'Reminder',
        object: reminder.task,
        object_class: 'CrmTask',
        title: task.title
      }
      n.message = ''

      Context.log('>>> (CrmTask::Worker::sendReminderNotifications)', 'Creating ReminderIsDue notification on reminder', reminder.id)
      await promisify(Notification.issueForUsers)(n, task.assignees, {})

      await patchNeedsNotificationOnReminder(reminder.id)
    }
  }
}

async function patchNeedsNotificationOnReminder(reminder_id) {
  return db.update('crm/reminder/patch_notification', [
    reminder_id,
    false
  ])
}

/**
 * Creates notifications for tasks that are due now.
 * Used in workers.
 * @internal
 */
async function sendTaskDueNotifications() {
  const ids = await db.selectIds('crm/task/now', [])
  const tasks = await Task.getAll(ids, true)

  for (const task of tasks) {
    /** @type {INotificationInput} */
    const n = {
      action: 'IsDue',
      subject: task.id,
      subject_class: 'CrmTask',
      object: task.id,
      object_class: 'CrmTask',
      message: 'TaskIsDueForUser',
      title: task.title
    }
    n.message = ''

    Context.log('>>> (CrmTask::Worker::sendTaskDueNotifications)', 'Creating TaskIsDue notification on task', task.id)
    await promisify(Notification.issueForUsers)(n, task.assignees, {})
    await patchNeedsNotificationOnTask(task.id)
  }
}

async function patchNeedsNotificationOnTask(task_id) {
  return db.update('crm/task/patch_notification', [
    task_id,
    false
  ])
}

/**
 * Fetch all unread notifications related to tasks
 * @private
 * @returns {Promise<INotification[]>}
 */
async function getUnreadNotifications() {
  const models = await db.select('crm/task/unread', [
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
        'crm_task.assignees',
        'crm_task.associations',
        'crm_association.contact',
        'crm_association.deal',
        'crm_association.listing',
        'contact.summary'
      ]
    }))
  }

  Context.set({user: original_user})

  return populated
}

/**
 * Sends an email for unread task notifications
 */
async function sendEmailForUnread() {
  const unread_task_notifications = await getUnreadNotifications()

  for (const n of unread_task_notifications) {
    /** @type {ITask} */
    const task = n.objects[0]
    /** @type {IUser} */
    const user = n.subjects[0]

    const mailer = new TaskMailer({ user, task, notification: n })
    await mailer.send()
    await promisify(Notification.saveDelivery)(n.id, user.id, user.email, 'email')
  }
}

class TaskWorker {
  /**
   * Main worker entry function
   */
  static async sendNotifications() {
    await sendReminderNotifications()
    await sendTaskDueNotifications()
    await sendEmailForUnread()
  }
}

module.exports = TaskWorker
