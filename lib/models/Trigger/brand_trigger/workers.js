const { strict: assert } = require('assert')
const zip = require('lodash/zip')
const { peanar } = require('../../../utils/peanar')
const BrandTemplate = require('../../Template/brand/get')
const Campaign = require('../../Email/campaign/create')
const Email = require('../../Email/constants')
const Contact = {
  ...require('../../Contact/get'),
  ...require('../../Contact/render-template'),
  ...require('../../Contact/fast_filter'),
}
const BrandTrigger = require('./get')
const Trigger = {
  ...require('../create'),
  ...require('../delete'),
  ...require('../filter'),
  ...require('../get'),
}

/** @typedef {import('../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */
/** @typedef {import('../../Trigger/trigger').ITriggerInput} ITriggerInput */

/**
 * @param {IContact} contact
 * @param {string} attrType
 * @returns {number}
 */
// eslint-disable-next-line no-unused-vars
function getDateAttr (contact, attrType) {
  const attr = contact.attributes.find(a => a.attribute_type === attrType)

  assert(attr, `Contact attr. not found for type: ${attrType}`)
  assert.equal(typeof attr.date, 'number', `Invalid date value: ${attr.date}`)

  return attr.date
}

/**
 * @param {UUID} brandId
 * @param {string} attributeType
 * @param {UUID[]?=} [excludeIds=null]
 * @returns {Promise<UUID[]>}
 */
async function getContactsIdsHavingDateAttribute (
  brandId,
  attributeType,
  excludeIds = null
) {
  const contactIds = await Contact.getHavingDateAttribute(
    brandId,
    attributeType,
  )

  if (!contactIds.length || !excludeIds?.length) { return contactIds }

  const excludeSet = new Set(excludeIds)
  return contactIds.filter(id => !excludeSet.has(id))
}

/**
 * Filter contacts and returns only contacts without trigger for eventType
 * @param {UUID} brandId
 * @param {UUID[]} contactIds
 * @param {string} eventType
 * @returns {Promise<UUID[]>}
 */
async function filterContactsWithoutTrigger (brandId, contactIds, eventType) {
  if (!contactIds?.length) { return [] }
  
  /** @type {any[]} */
  const triggers = await Trigger.getPendingContactTriggers({
    contactIds,
    action: 'schedule_email',
    eventType,
    brandId,
  }).then(Trigger.getAll)

  if (triggers?.length) { return [] }
  const excludeSet = new Set(triggers.map(t => t.contact))
  
  return contactIds.filter(id => !excludeSet.has(id))
}

/**
 * @param {BrandTrigger} brandTrigger
 * @param {UUID[]} contactIds
 * @returns {Promise<UUID[]>}
 */
async function createCampaigns (brandTrigger, contactIds) {
  const contacts = await Contact.getAll(contactIds)
  const brandTemplate = await BrandTemplate.get(brandTrigger.template)

  const htmls = await Contact.renderTemplate({
    templateId: brandTemplate.template,
    userId: brandTrigger.created_by,
    brandId: brandTrigger.brand,
    contacts,
  })

  return Campaign.createMany(contacts.map((c, i) => ({
    created_by: brandTrigger.created_by,
    brand: brandTrigger.brand,
    individual: true,
    due_at: null,
    
    subject: brandTrigger.subject,
    from: brandTrigger.created_by,
    to: [{
      contact: c.id,
      email: /** @type {string} */(c.email),
      recipient_type: Email.EMAIL
    }],

    template: brandTrigger.template_instance,
    html: htmls[i],
  })))
}

/**
 * @param {BrandTrigger} brandTrigger
 * @param {UUID[]} contactIds
 * @param {UUID[]} campaignIds
 * @returns {Promise<UUID[]>}
 */
async function createTriggers (brandTrigger, contactIds, campaignIds) {
  assert.equal(contactIds.length, campaignIds.length)
  
  /** @type {(_: [UUID, UUID]) => ITriggerInput} */
  const mapper = ([contactId, campaignId]) => ({
    action: 'schedule_email',

    brand: brandTrigger.brand,
    event_type: brandTrigger.event_type,
    created_by: brandTrigger.created_by,
    user: brandTrigger.created_by,
    wait_for: brandTrigger.wait_for,
    
    campaign: campaignId ?? assert.fail('Impossible state: nil campaign ID'),
    contact: contactId ?? assert.fail('Impossible state: nil contact ID'),

    time: '08:00:00', // XXX: How to specify the time
  })
  
  const zipped = /** @type {[UUID, UUID][]} */(zip(contactIds, campaignIds))
  return Trigger.create(zipped.map(mapper))
}

/**
 * @param {UUID} brandTriggerId
 * @param {boolean} overrideManualTriggers
 */
async function createTriggersHandler (brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) { return }

  let contactIds = await getContactsIdsHavingDateAttribute(
    bt.brand,
    bt.event_type,
  )
  if (!contactIds?.length) { return }

  if (overrideManualTriggers) {
    await Trigger.deleteForContacts(contactIds, bt.created_by, bt.brand)
  } else {
    contactIds = await filterContactsWithoutTrigger(
      bt.brand,
      contactIds,
      bt.event_type
    )
    if (!contactIds.length) { return }
  }

  const campaignIds = await createCampaigns(bt, contactIds)
  await createTriggers(bt, contactIds, campaignIds)  
}

/**
 * @param {UUID} brandTriggerId
 * @param {boolean} overrideManualTriggers
 */
async function updateTriggersHandler (brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) { return }

  const filters = {
    brand: bt.brand,
    event_type: bt.event_type,
    action: 'schedule_email',
    executed_at: null,
    flow_step: null,
    flow: null,
  }

  /** @type {UUID[]} */
  let excludeIds = []

  if (!overrideManualTriggers) {
    excludeIds = await Trigger
      .filter({ ...filters, origin_ne: bt.id })
      .then(Trigger.getAll)
      .then(res => res.map(t => /** @type {any} */(t).contact))
  }

  const contactIds = await getContactsIdsHavingDateAttribute(
    bt.brand,
    bt.event_type,
    excludeIds,
  )
  if (!contactIds.length) { return }
  
  const oldTriggerIds = await Trigger.filter(
    { ...filters, contacts: contactIds }
  )
  if (oldTriggerIds.length) {
    await Trigger.delete(oldTriggerIds, bt.created_by)
  }

  const campaignIds = await createCampaigns(bt, contactIds)
  await createTriggers(bt, contactIds, campaignIds)  
}

module.exports = {
  createTriggers: peanar.job({
    handler: createTriggersHandler,
    queue: 'brand_triggers',
  }),
  
  updateTriggers: peanar.job({
    handler: updateTriggersHandler,
    queue: 'brand_triggers',
  }),
}
