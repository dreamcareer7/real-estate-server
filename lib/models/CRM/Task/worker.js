const _ = require('lodash')
const debug = require('debug')('rechat:workers')

const config = require('../../../config')
const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

const Notification = require('../../Notification')
const Orm = require('../../Orm')

const Reminder = require('./reminder')
const Task = require('./index')
const TaskMailer = require('./mailer')

/**
 * Patches notification id of a task after sending TaskIsDue notification
 * @param {UUID} task_id
 * @param {UUID} notification_id 
 * @private
 */
function patchTaskNotification(task_id, notification_id) {
  return db.update('crm/task/patch_notification', [
    task_id,
    notification_id
  ])
}

/**
 * Sets notification id on a reminder after it is created
 * @private
 * @param {UUID} reminder_id Reminder id to patch its notification
 * @param {UUID} notification_id Notification id created for the reminder
 */
function patchReminderNotification(reminder_id, notification_id) {
  return db.update('crm/reminder/patch_notification', [
    reminder_id,
    notification_id
  ])
}

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
    if (taskIndex[reminder.task]) {
      /** @type {INotificationInput} */
      const n = {
        action: 'IsDue',
        subject: reminder.id,
        subject_class: 'Reminder',
        object: reminder.task,
        object_class: 'CrmTask',
        specific: taskIndex[reminder.task].assignee,
        title: taskIndex[reminder.task].title
      }
      n.message = await promisify(Notification.formatForDisplay)(n, {
        objects: [taskIndex[reminder.task]]
      }, 'push')

      debug('>>> (CrmTask::Worker::sendReminderNotifications)', 'Creating ReminderIsDue notification on reminder', reminder.id)
      const notification = await promisify(Notification.create)(n)
      debug('>>> (CrmTask::Worker::sendReminderNotifications)', 'Patching notificaiton id on reminder')
      await patchReminderNotification(reminder.id, notification.id)
    }
  }
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
      specific: task.assignee,
      message: 'TaskIsDueForUser',
      title: task.title
    }
    n.message = await promisify(Notification.formatForDisplay)(n, {
      objects: [task]
    }, 'push')

    debug('>>> (CrmTask::Worker::sendTaskDueNotifications)', 'Creating TaskIsDue notification on task', task.id)
    const notification = await promisify(Notification.create)(n)
    debug('>>> (CrmTask::Worker::sendTaskDueNotifications)', 'Patching notificaiton id on task')
    await patchTaskNotification(task.id, notification.id)
  }
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
  const original_user = process.domain.user

  let populated = []
  for (const [user_id, notifications] of Object.entries(notifications_by_user)) {
    process.domain.user = { id: user_id }

    populated = populated.concat(await Orm.populate({
      models: notifications,
      associations: [
        'crm_task.associations',
        'crm_association.contact',
        'crm_association.deal',
        'crm_association.listing',
        'contact.summary'
      ]
    }))
  }

  process.domain.user = original_user

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

    const mailer = new TaskMailer({ user, task })
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
