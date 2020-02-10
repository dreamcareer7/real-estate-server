const db  = require('../../../utils/db.js')
const Orm = require('../../Orm')


const CalendarIntegration = {}



CalendarIntegration.insert = async (records) => {
  if (records.length === 0)
    return []

  return db.select('calendar/integration/insert', [JSON.stringify(records)])
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.getAll = async (ids) => {
  return await db.select('calendar/integration/get', [ids])
}

/**
 * @param {UUID} id
 */
CalendarIntegration.get = async (id) => {
  const calendars = await CalendarIntegration.getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {UUID[]} google_ids
 */
CalendarIntegration.getByGoogleIds = async (google_ids) => {
  const ids = await db.selectIds('calendar/integration/get_by_google_ids', [google_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID} crm_task_id
 */
CalendarIntegration.getByGoogleCrmTask = async (crm_task_id) => {
  const ids = await db.selectIds('calendar/integration/get_by_crm_task', [crm_task_id])

  if (ids.length < 1)
    return null

  return await CalendarIntegration.getAll(ids[0])
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.deleteMany = async function (ids) {
  await db.select('calendar/integration/delete', [ids])
}



Orm.register('calendar_integration', 'CalendarIntegration', CalendarIntegration)

module.exports = CalendarIntegration