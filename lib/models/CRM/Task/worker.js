const _ = require('lodash')
const debug = require('debug')('rechat:workers')

const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')

const Notification = require('../../Notification')
const Reminder = require('../Reminder')
const Task = require('./index')
const TaskMailer = require('./mailer')

/**
 * Patches notification id of a task after sending TaskIsDue notification
 * @param {UUID} task_id
 * @param {UUID} notification_id 
 * @private
 */
function patchTaskNotification(task_id, notification_id) {
  return db.query.promise('crm/task/patch_notification', [
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
  return db.query.promise('crm/reminder/patch_notification', [
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
      /** @type {INotification} */
      const n = {
        action: 'IsDue',
        subject: reminder.id,
        subject_class: 'Reminder',
        object: reminder.task,
        object_class: 'CrmTask',
        specific: taskIndex[reminder.task].assignee,
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
    /** @type {INotification} */
    const n = {
      action: 'IsDue',
      subject: task.id,
      subject_class: 'CrmTask',
      object: task.id,
      object_class: 'CrmTask',
      specific: task.assignee,
      message: 'TaskIsDueForUser'
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

class TaskWorker {
  /**
   * Main worker entry function
   */
  static async sendNotifications() {
    await sendReminderNotifications()
    await sendTaskDueNotifications()
    await TaskMailer.sendEmailForUnread()
  }
}

module.exports = TaskWorker
