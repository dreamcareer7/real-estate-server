const db = require('../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('calendar_integration/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {UUID[]} google_ids
 */
const getByGoogleIds = async (google_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_google_ids', [google_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} microsoft_ids
 */
const getByMicrosoftIds = async (microsoft_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_microsoft_ids', [microsoft_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} crm_task_ids
 */
const getByCrmTasks = async (crm_task_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_crm_tasks', [crm_task_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} contact_ids
 */
const getByContacts = async (contact_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_contacts', [contact_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} contact_attribute_ids
 */
const getByContactAttributes = async (contact_attribute_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_contact_attributes', [contact_attribute_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} deal_context_ids
 */
const getByDealContexts = async (deal_context_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_deal_contexts', [deal_context_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}

/**
 * @param {UUID[]} deal_context_ids
 */
const getByHomeAnniversaries = async (deal_context_ids) => {
  const ids = await db.selectIds('calendar_integration/get_by_home_anniversaries', [deal_context_ids])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}


module.exports = {
  getAll,
  get,
  getByGoogleIds,
  getByMicrosoftIds,
  getByCrmTasks,
  getByContacts,
  getByContactAttributes,
  getByDealContexts,
  getByHomeAnniversaries
}