const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')

const CalendarIntegration = {}



CalendarIntegration.insert = async (records) => {
  if (records.length === 0)
    return []

  return db.select('calendar_integration/insert', [JSON.stringify(records)])
}

CalendarIntegration.gupsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('calendar_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('crm_task = COALESCE(uv.crm_task::uuid, cali.crm_task::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.google_id = uv.google_id::uuid')

    q.name = 'calendar_integration/gupsert'

    return db.update(q, [])
  })  
}

CalendarIntegration.mupsert = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('calendar_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('crm_task = COALESCE(uv.crm_task::uuid, cali.crm_task::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.microsoft_id = uv.microsoft_id::uuid')

    q.name = 'calendar_integration/mupsert'

    return db.update(q, [])
  })  
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.getAll = async (ids) => {
  return await db.select('calendar_integration/get', [ids])
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
  const ids = await db.selectIds('calendar_integration/get_by_google_ids', [google_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} microsoft_ids
 */
CalendarIntegration.getByMicrosoftIds = async (microsoft_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_microsoft_ids', [microsoft_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} crm_task_ids
 */
CalendarIntegration.getByCrmTasks = async (crm_task_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_crm_tasks', [crm_task_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} contact_ids
 */
CalendarIntegration.getByContacts = async (contact_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_contacts', [contact_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} contact_attribute_ids
 */
CalendarIntegration.getByContactAttributes = async (contact_attribute_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_contact_attributes', [contact_attribute_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} deal_context_ids
 */
CalendarIntegration.getByDealContexts = async (deal_context_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_deal_contexts', [deal_context_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} deal_context_ids
 */
CalendarIntegration.getByHomeAnniversaries = async (deal_context_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_home_anniversaries', [deal_context_ids])

  if (ids.length < 1)
    return []

  return await CalendarIntegration.getAll(ids)
}

/**
 * @param {UUID[]} ids
 */
CalendarIntegration.deleteMany = async function (ids) {
  await db.select('calendar_integration/delete', [ids])
}

/**
 * @param {UUID[]} crm_tasks
 * @param {String} origin source of change
 */
CalendarIntegration.resetEtagByCrmTask = async function (crm_tasks, origin) {
  await db.select('calendar_integration/reset_etag_by_crm_task', [crm_tasks, origin])
}


Orm.register('calendar_integration', 'CalendarIntegration', CalendarIntegration)

module.exports = CalendarIntegration