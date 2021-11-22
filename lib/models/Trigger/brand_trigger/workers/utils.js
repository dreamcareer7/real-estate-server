const { strict: assert } = require('assert')
const uniq = require('lodash/uniq')
const zip = require('lodash/zip')

const Orm = require('../../../../../lib/models/Orm/context')
const BrandTemplate = require('../../../Template/brand/get')
const Campaign = require('../../../Email/campaign/create')
const Email = require('../../../Email/constants')
const Contact = {
  ...require('../../../Contact/get'),
  ...require('../../../Contact/render-template'),
}
const Trigger = {
  ...require('../../create'),
  ...require('../../filter'),
  ...require('../../get'),
}

/** @typedef {import('../../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */
/** @typedef {import('../../../Trigger/trigger').ITriggerInput} ITriggerInput */
/** @typedef {import('../../../Trigger/trigger').IContactTrigger} IContactTrigger */

const COMMON_TRIGGER_FILTERS = Object.freeze({
  effectively_executed: false,
  action: ['schedule_email'],
  deleted_at: null,
  flow_step: null,
  flow: null,
})

/**
 * @param {any} filters
 * @param {boolean=} [mergeToCommonFilters=true]
 * @returns {Promise<IContactTrigger[]>}
 */
async function filterTriggers(filters, mergeToCommonFilters = true) {
  if (mergeToCommonFilters) {
    filters = {
      ...COMMON_TRIGGER_FILTERS,
      ...filters,
    }
  }

  const triggerIds = await Trigger.filter(filters)
  if (!triggerIds?.length) {
    return []
  }

  const triggers = await Trigger.getAll(triggerIds)
  return /** @type {IContactTrigger[]} */ (/** @type {any[]} */ (triggers))
}

/**
 * @param {IContactTrigger[]} triggers
 * @param {IContactAttribute['attribute_type']?} [eventType=null]
 * @returns {Set<IContact['id']>}
 */
function extractContactIds(triggers, eventType = null) {
  if (eventType) {
    triggers = triggers.filter((t) => t.event_type === eventType)
  }

  return new Set(triggers.map((t) => t.contact))
}

/**
 * @param {BrandTrigger} brandTrigger
 * @param {IContact[]} contacts
 * @returns {Promise<UUID[]>}
 */
async function createCampaigns(brandTrigger, contacts) {
  const brandTemplate = await BrandTemplate.get(brandTrigger.template)

  const htmls = await Contact.renderTemplate({
    templateId: brandTemplate.template,
    userId: brandTrigger.created_by,
    brandId: brandTrigger.brand,
    contacts,
  })

  const mapper = ([contact, html]) => ({
    created_by: brandTrigger.created_by,
    brand: brandTrigger.brand,
    individual: true,
    due_at: null,

    subject: brandTrigger.subject,
    from: brandTrigger.created_by,
    to: [
      {
        contact: contact.id,
        recipient_type: Email.CONTACT,
      },
    ],

    template: brandTrigger.template_instance,
    html,
  })
  

  const campaignInfos = zip(contacts, htmls).map(mapper)
  if (!campaignInfos.length) { return [] }
  
  return Campaign.createMany(campaignInfos)
}

/**
 * @param {BrandTrigger} brandTrigger
 * @param {UUID[]} contactIds
 * @param {UUID[]} campaignIds
 * @returns {Promise<UUID[]>}
 */
async function createTriggers(brandTrigger, contactIds, campaignIds) {
  assert.equal(contactIds.length, campaignIds.length)

  /** @type {(_: [UUID, UUID]) => ITriggerInput} */
  const mapper = ([contactId, campaignId]) => ({
    action: 'schedule_email',

    brand: brandTrigger.brand,
    event_type: brandTrigger.event_type,
    created_by: brandTrigger.created_by,
    user: brandTrigger.created_by,
    wait_for: brandTrigger.wait_for,

    origin: brandTrigger.id,

    time: '08:00:00',
    recurring: true,

    campaign: campaignId ?? assert.fail('Impossible state: nil campaign ID'),
    contact: contactId ?? assert.fail('Impossible state: nil contact ID'),
  })

  const zipped = /** @type {[UUID, UUID][]} */ (zip(contactIds, campaignIds))
  return Trigger.create(zipped.map(mapper))
}

/**
 * @param {BrandTrigger} bt
 * @param {IContact['id'][]} contactIds
 */
async function createCampaignsAndTriggers (bt, contactIds) {
  Orm.enableAssociation('contact.attributes')
  const contacts = await Contact.getAll(contactIds)
  
  contactIds = contacts.map(c => c.id)

  const campaignIds = await createCampaigns(bt, contacts)
  return createTriggers(bt, contactIds, campaignIds)
}

/**
 * @param {IBrand['id']} brandId
 * @param {IContactAttributeInputWithContact[]} attributes
 * @returns {Promise<IContactAttributeInputWithContact[]>}
 */
async function filterAttributesHavingNoFlowTrigger(brandId, attributes) {
  const triggers = await filterTriggers({
    event_type: uniq(attributes.map((a) => a.attribute_type)),
    contacts: uniq(attributes.map((a) => a.contact)),
    brand: brandId,
    deleted_at: null,
    flow: true,
    effectively_executed: false,
    action: ['schedule_email'],
  }, false)

  if (!triggers?.length) {
    return attributes
  }

  /** @type {(_: IContactTrigger) => string} */
  const triggerKey = (t) => `${t.contact}#${t.event_type}`
  /** @type {(_: IContactAttributeInputWithContact) => string } */
  const attrKey = (a) => `${a.contact}#${a.attribute_type}`

  const triggerKeys = new Set(triggers.map(triggerKey))
  return attributes.filter((a) => !triggerKeys.has(attrKey(a)))
}

module.exports = {
  COMMON_TRIGGER_FILTERS,
  filterTriggers,
  filterAttributesHavingNoFlowTrigger,
  extractContactIds,
  createCampaignsAndTriggers,
}