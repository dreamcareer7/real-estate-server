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
 * @param {UUID} contactId
 * @param {string} eventType
 * @returns {Promise<UUID>}
 */
async function getByContactAndEventType (contactId, eventType) {
  return db.selectId('trigger/get_by_contact_and_event_type', [
    contactId,
    eventType,
  ])
}

module.exports = {
  getDue,
  getAll,
  get,
  getByContactAndEventType,
}
