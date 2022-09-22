const _ = require('lodash')

const config = require('../../../../config')
const db = require('../../../../utils/db.js')
const promisify = require('../../../../utils/promisify')

const Context = require('../../../Context')
const Notification = {
  ...require('../../../Notification/get'),
  ...require('../../../Notification/issue'),
  ...require('../../../Notification/delivery'),
}
const Orm = require('../../../Orm/index')

const Reminder = require('../reminder')
const Task = {
  ...require('../get'),
  ...require('../action'),
}
const Assignee = require('../assignee')
const TaskMailer = require('../mailer')

class TaskWorker {
  /**
   * Creates notifications for reminders that are due now.
   * Used in workers.
   * @internal
   */
  async sendReminderNotifications() {
    const reminders = await this.getDueReminders()
    const tasks = await Task.getAll(reminders.map(r => r.task), true)
    const taskIndex = _.keyBy(tasks, 'id')

    for (const reminder of reminders) {
      const task = taskIndex[reminder.task]
      if (!task) continue

      task.assignees = await this.getAssignees(task.id)
      /** @type {INotificationInput} */
      const n = {
        action: 'IsDue',
        subject: reminder.id,
        subject_class: 'Reminder',
        object: reminder.task,
        object_class: 'CrmTask',
        message: '',
        title: (task.task_type === 'Open House' ? 'Open House at ' : '') + task.title
      }

      Context.log('>>> (CrmTask::Worker::sendReminderNotifications)', 'Creating ReminderIsDue notification on reminder', reminder.id)
      await promisify(Notification.issueForUsers)(n, task.assignees, {})

      await this.patchNeedsNotificationOnReminder(reminder.id)
    }
  }

  async patchNeedsNotificationOnReminder(reminder_id) {
    return db.update('crm/reminder/patch_notification', [
      reminder_id,
      false
    ])
  }

  async getDueTasks() {
    const ids = await db.selectIds('crm/task/now', [])
    const tasks_to_notify = await Task.findTasksThatShouldReceiveNotification(
      ids
    )

    return Task.getAll(tasks_to_notify, true)
  }

  async getAssignees(taskId) {
    const assignees = await Assignee.getForTask(taskId)
    return assignees.map(x => x.user)
  }

  async getDueReminders() {
    const ids = await db.selectIds('crm/reminder/now', [])
    const reminders = await Reminder.getAll(ids)

    const tasks_to_notify = await Task.findTasksThatShouldReceiveNotification(
      reminders.map(r => r.task)
    )
    return reminders.filter(r => tasks_to_notify.includes(r.task))
  }

  /**
   * Creates notifications for tasks that are due now.
   * Used in workers.
   * @internal
   */
  async sendTaskDueNotifications() {
    const tasks = await this.getDueTasks()

    for (const task of tasks) {
      const assignees = await this.getAssignees(task.id)
      /** @type {INotificationInput} */
      const n = {
        action: 'IsDue',
        subject: task.id,
        subject_class: 'CrmTask',
        object: task.id,
        object_class: 'CrmTask',
        message: '',
        title: task.title
      }

      Context.log('>>> (CrmTask::Worker::sendTaskDueNotifications)', 'Creating TaskIsDue notification on task', task.id)
      await promisify(Notification.issueForUsers)(n, assignees, {})
      await this.patchNeedsNotificationOnTask(task.id)
    }
  }

  async patchNeedsNotificationOnTask(task_id) {
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
  async getUnreadNotifications() {
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
          'crm_association.listing'
        ]
      }))
    }

    Context.set({user: original_user})

    return populated
  }

  /**
   * Sends an email for unread task notifications
   */
  async sendEmailForUnread() {
    const unread_task_notifications = await this.getUnreadNotifications()

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

  /**
   * Main worker entry function
   */
  async sendNotifications() {
    await this.sendReminderNotifications()
    await this.sendTaskDueNotifications()
    await this.sendEmailForUnread()
  }
}

module.exports = new TaskWorker
