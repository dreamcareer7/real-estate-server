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
 * @param {UUID[]} microsoft_ids
 */
CalendarIntegration.getByMicrosoftIds = async (microsoft_ids) => {
  const ids = await db.selectIds('calendar/integration/get_by_microsoft_ids', [microsoft_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID} crm_task_id
 */
CalendarIntegration.getByCrmTask = async (crm_task_id) => {
  const ids = await db.selectIds('calendar/integration/get_by_crm_task', [crm_task_id])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID} contact_id
 */
CalendarIntegration.getByContact = async (contact_id) => {
  const ids = await db.selectIds('calendar/integration/get_by_contact', [contact_id])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID} contact_attribute_id
 */
CalendarIntegration.getByContactAttribute = async (contact_attribute_id) => {
  const ids = await db.selectIds('calendar/integration/get_by_contact_attribute', [contact_attribute_id])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID} deal_context_id
 */
CalendarIntegration.getByDealContext = async (deal_context_id) => {
  const ids = await db.selectIds('calendar/integration/get_by_deal_context', [deal_context_id])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.deleteMany = async function (ids) {
  await db.select('calendar/integration/delete', [ids])
}



Orm.register('calendar_integration', 'CalendarIntegration', CalendarIntegration)

module.exports = CalendarIntegration