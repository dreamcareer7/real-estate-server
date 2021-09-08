const db = require('../../utils/db')

/** @typedef {import('./trigger').IStoredTrigger} IStoredTrigger */

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
/* NOTE: Was used in prior implementation of global triggers (when we want to
 * not override manual triggers).
 * see also: /lib/models/Trigger/brand_trigger/workers.js */
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
 * @param {IContact['id'][]} options.contactIds
 * @param {string[]?=} [options.eventTypes=null]
 * @param {string[]?=} [options.actions=null]
 * @param {boolean?=} [options.hasFlow=null]
 * @returns {Promise<Pick<IStoredTrigger, 'id' | 'flow'>[]>}
 */
async function getActiveContactTriggers ({
  contactIds,
  eventTypes = null,
  actions = null,
  hasFlow = null,
}) {
  if (!contactIds?.length || eventTypes?.length === 0 || actions?.length === 0) {
    return []
  }

  return db.select('trigger/active_contact_triggers', [
    contactIds,
    eventTypes,
    actions,
    hasFlow
  ])
}

module.exports = {
  getDue,
  getAll,
  get,
  getPendingContactTriggers,
  getActiveContactTriggers,
}
