const db = require('../../../utils/db.js')
const validator = require('../../../utils/validator.js')
const belt = require('../../../utils/belt')

const { reminderSchema: schema } = require('../schemas.js')
const Notification = require('../../Notification')
const Orm = require('../../Orm')

const validate = validator.promise.bind(null, schema)

function raiseNotFound(id) {
  throw Error.ResourceNotFound(`Reminder ${id} not found`)
}

const Reminder = {
  /**
   * Get a reminder by id
   * @param {UUID} id Reminder id to fetch
   * @returns {Promise<IReminder>}
   */
  async get(id) {
    const reminders = await Reminder.getAll([id])

    if (!reminders || reminders.length < 1) {
      raiseNotFound(id)
    }

    return reminders[0]
  },

  /**
   * Get multiple Reminders by id
   * @param {UUID[]} ids Array of Reminder ids to fetch
   * @returns {Promise<IReminder[]>}
   */
  async getAll(ids) {
    const res = await db.query.promise('crm/reminder/get', [
      ids,
    ])

    return res.rows
  },

  /**
   * Create a reminder
   * @param {IReminderInput} reminder Reminder object to add
   * @param {ITask} task Parent task of the Reminder
   * @return {Promise<UUID>}
   */
  async create(reminder, task) {
    await validate(reminder)

    const timestamp = belt.epochToDate(reminder.timestamp)

    const res = await db.query.promise('crm/reminder/insert', [
      task.id,
      reminder.is_relative,
      timestamp
    ])

    return res.rows[0].id
  },

  /**
   * Remove a reminder
   * @param {UUID} reminder_id Reminder id to be removed
   * @return {Promise<any>}
   */
  async remove(reminder_id) {
    const reminder = await Reminder.get(reminder_id)

    const res = await db.query.promise('crm/reminder/delete', [
      reminder_id,
    ])

    if (reminder.notification)
      await Notification.remove(reminder.notification)

    return res
  },

  /**
   * Update a reminder
   * @param {IReminderInput} reminder Reminder object with id to be updated
   * @param {ITask} task Parent task data object of the reminder
   */
  async update(reminder, task) {
    await validate(reminder)

    const timestamp = belt.epochToDate(reminder.timestamp)

    return db.update('crm/reminder/update', [
      task.id,
      reminder.id,
      reminder.is_relative,
      timestamp
    ])
  }
}

Orm.register('reminder', 'Reminder', Reminder)

module.exports = Reminder
