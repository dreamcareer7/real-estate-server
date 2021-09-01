const db = require('../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./trigger').IStoredTrigger[]>}
 */
async function getAll(ids) {
  return db.select('trigger/get', [ids])
}

/**
 * @param {UUID} id
 * @returns {Promise<import('./trigger').IStoredTrigger>}
 */
async function get(id) {
  const campaigns = await getAll([id])

  if (campaigns.length < 1)
    throw Error.ResourceNotFound(`Email Campaign ${id} not found`)

  return campaigns[0]
}

/**
 * @param {UUID} id 
 * @returns {Promise<import('./trigger').IDueTrigger | undefined>}
 */
async function getDue(id) {
  return db.selectOne('trigger/get_due', [ id ])
}

/**
 * @param {object} options
 * @param {UUID} options.brandId
 * @param {UUID[]} options.contactIds
 * @param {string} options.eventType
 * @param {('schedule_email' | 'create_event')} options.action
 * @returns {Promise<UUID[]>}
 */
async function getPendingContactTriggers ({
  brandId, contactIds, eventType, action
}) {
  return db.selectIds('trigger/get_pending_contact_triggers', [
    brandId,
    contactIds,
    eventType,
    action
  ])
}

/**
 * @param {object} options
 * @param {UUID} options.brandId
 * @param {string} options.eventType
 */
async function getContactIdsToCreateTriggerFor ({ brandId, eventType }) {
  return db.selectIds('trigger/contact_ids_to_create_trigger_for', [
    brandId,
    eventType
  ])
}

module.exports = {
  getDue,
  getAll,
  get,
  getPendingContactTriggers,
  getContactIdsToCreateTriggerFor
}
