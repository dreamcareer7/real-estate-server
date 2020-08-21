const db = require('../../../../utils/db.js')


/**
 * Get a reminder by id
 * @param {UUID} id Reminder id to fetch
 * @returns {Promise<IReminder>}
 */
const get = async (id) => {
  const reminders = await getAll([id])

  if (!reminders || reminders.length < 1) {
    throw Error.ResourceNotFound(`Reminder ${id} not found`)
  }

  return reminders[0]
}

/**
 * Get multiple Reminders by id
 * @param {UUID[]} ids Array of Reminder ids to fetch
 * @returns {Promise<IReminder[]>}
 */
const getAll = async (ids) => {
  const res = await db.query.promise('crm/reminder/get', [
    ids,
  ])

  return res.rows
}


module.exports = {
  get,
  getAll
}