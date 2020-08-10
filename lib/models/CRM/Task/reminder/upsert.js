const _ = require('lodash')
const sq = require('../../../../utils/squel_extensions')

const db = require('../../../../utils/db.js')
const validator = require('../../../../utils/validator.js')
const belt = require('../../../../utils/belt')

const { reminderSchema: schema } = require('../schemas.js')
const Notification = require('../../../Notification')

const validate = validator.promise.bind(null, schema)

const { get } = require('./get')


/**
 * Create a reminder
 * @param {IReminderInput} reminder Reminder object to add
 * @param {ITask} task Parent task of the Reminder
 * @return {Promise<UUID>}
 */
const create = async (reminder, task) => {
  await validate(reminder)

  const timestamp = belt.epochToDate(reminder.timestamp)

  return db.insert('crm/reminder/insert', [
    task.id,
    reminder.is_relative,
    timestamp.toISOString(),
    task.status !== 'DONE'
  ])
}

/**
 * Create multiple reminders in bulk
 * @param {RequireProp<IReminderInput, 'needs_notification'>[]} reminders 
 */
const createMany = async (reminders) => {
  if (reminders.length < 1) return []

  // task, is_relative, "timestamp", needs_notification
  const data = reminders.map(r => ({
    task: r.task,
    is_relative: r.is_relative,
    timestamp: belt.epochToDate(r.timestamp).toISOString(),
    needs_notification: r.needs_notification
  }))

  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const result = await Promise.all(_(data)
    .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / Object.keys(data[0]).length))
    .map((chunk, i) => {
      const q = sq.insert({ autoQuoteFieldNames: true })
        .into('reminders')
        .setFieldsRows(chunk)
        .returning('id')

      // @ts-ignore
      q.name = `crm/reminder/create_many#${i}`

      return db.selectIds(q)
    })
    .value()
  )

  return result.flat()
}

/**
 * Remove a reminder
 * @param {UUID} reminder_id Reminder id to be removed
 * @return {Promise<any>}
 */
const remove = async (reminder_id) => {
  const reminder = await get(reminder_id)

  const res = await db.query.promise('crm/reminder/delete', [
    reminder_id,
  ])

  if (reminder.notification)
    await Notification.remove(reminder.notification)

  return res
}

/**
 * Remove a reminder
 * @param {UUID[]} reminders Reminder id to be removed
 * @return {Promise<void>}
 */
const removeMany = async (reminders) => {
  if (reminders.length < 1) return

  await db.update('crm/reminder/delete_many', [
    reminders,
  ])

  // for (const notification of notifications) {
  //   await Notification.remove(notification)
  // }
}

/**
 * Update a reminder
 * @param {IReminderInput} reminder Reminder object with id to be updated
 * @param {ITask} task Parent task data object of the reminder
 */
const update = async (reminder, task) => {
  await validate(reminder)

  const timestamp = belt.epochToDate(reminder.timestamp)

  return db.update('crm/reminder/update', [
    task.id,
    reminder.id,
    reminder.is_relative,
    timestamp.toISOString(),
    task.status !== 'DONE'
  ])
}

/**
 * Update a bunch of reminders for multiple tasks
 * @param {RequireProp<IReminderInput, 'id' | 'needs_notification'>[]} reminders 
 */
const updateMany = async (reminders) => {
  await Promise.all(reminders.map(r => validate(r)))

  // task, is_relative, "timestamp", needs_notification
  const data = reminders.map(r => ({
    id: r.id,
    is_relative: r.is_relative,
    timestamp: belt.epochToDate(r.timestamp).toISOString(),
    needs_notification: r.needs_notification
  }))

  const res = await db.update('crm/reminder/update_many', [
    JSON.stringify(data)
  ])

  return res
}
  

module.exports = {
  create,
  createMany,
  remove,
  removeMany,
  update,
  updateMany
}