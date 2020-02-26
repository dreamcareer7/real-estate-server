const db  = require('../../utils/db.js')
const Orm = require('../Orm')
const CrmTask = require('../CRM/Task/index')

const CalendarIntegration = {}


async function onEvent({ task_ids }) {
  console.log('---- CalendarIntegration CrmTask event listener ==> here I am!', task_ids)
  await CalendarIntegration.resetEtagByCrmTask(task_ids)
}

function attachEventHandlers() {
  CrmTask.on('create', onEvent)
  CrmTask.on('update', onEvent)
  CrmTask.on('delete', onEvent)
}


CalendarIntegration.insert = async (records) => {
  if (records.length === 0)
    return []

  return db.select('calendar_integration/insert', [JSON.stringify(records)])
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
 * @param {UUID} crm_task
 */
CalendarIntegration.resetEtagByCrmTask = async function (crm_tasks) {
  await db.select('calendar_integration/reset_etag_by_crm_task', [crm_tasks])
}


attachEventHandlers()


Orm.register('calendar_integration', 'CalendarIntegration', CalendarIntegration)

module.exports = CalendarIntegration