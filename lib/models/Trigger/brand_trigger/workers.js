const { strict: assert } = require('assert')
const zip = require('lodash/zip')

const BrandTemplate = require('../../Template/brand/get')
const Campaign = require('../../Email/campaign/create')
const { peanar } = require('../../../utils/peanar')
const Email = require('../../Email/constants')
const Contact = {
  ...require('../../Contact/get'),
  ...require('../../Contact/render-template'),
}
const BrandTrigger = require('./get')
const Trigger = {
  ...require('../create'),
  ...require('../delete'),
  ...require('../filter'),
  ...require('../get')

}

/** @typedef {import('../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */
/** @typedef {import('../../Trigger/trigger').ITriggerInput} ITriggerInput */

/**
 * @param {BrandTrigger} brandTrigger
 * @param {UUID[]} contactIds
 * @returns {Promise<UUID[]>}
 */
async function createCampaigns (brandTrigger, contactIds) {
  const brandTemplate = await BrandTemplate.get(brandTrigger.template)
  const contacts = await Contact.getAll(contactIds)
  
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
    to: [{
      contact: contact.id,
      email: /** @type {string} */(contact.primary_email),
      recipient_type: Email.EMAIL
    }],

    template: brandTrigger.template_instance,
    html,    
  })

  const campaignInfos = zip(contacts, htmls).map(mapper)
  return Campaign.createMany(campaignInfos)
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
async function updateTriggersHandler (brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) { return }

  const triggerIds = await Trigger.filter({
    ...(overrideManualTriggers ? null : { origin: bt.id }),
    effectively_executed: false,
    brand: bt.brand,
    event_type: bt.event_type,
    action: 'schedule_email',
    flow_step: null,
    flow: null,
  })
  if (triggerIds.length) {
    await Trigger.delete(triggerIds, bt.created_by)
  }

  const contactIds = await Trigger.getContactIdsToCreateTriggerFor({
    brandId: bt.brand,
    eventType: bt.event_type,
  })
  if (!contactIds.length) { return }

  const campaignIds = await createCampaigns(bt, contactIds)
  await createTriggers(bt, contactIds, campaignIds)
}

module.exports = {  
  updateTriggers: peanar.job({
    handler: updateTriggersHandler,
    queue: 'brand_triggers',
  }),
}
