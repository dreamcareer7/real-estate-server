const { strict: assert } = require('assert')
const zip = require('lodash/zip')
const chain = require('lodash/chain')
const renderTemplate = require('../../Template/thumbnail/render')
const { peanar } = require('../../../utils/peanar')

const BrandTemplate = require('../../Template/brand/get')
const Campaign = require('../../Email/campaign/create')
const Template = require('../../Template/get')
const Email = require('../../Email/constants')
const Contact = require('../../Contact/get')
const User = require('../../User/get')
const BrandTrigger = require('./get')
const Trigger = {
  ...require('../../Trigger/create'),
  ...require('../../Trigger/delete'),
  ...require('../../Trigger/get'),
}
const Brand = {
  ...require('../../Brand/get'),
  ...require('../../Brand/constants'),
}


const { promisify } = require('util')
const AttachedFile = require('../../AttachedFile')
const downloadFile = promisify(/**@type {any}*/(AttachedFile).download)

/** @typedef {import('../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */

/**
 * @param {IContact} contact
 * @param {string} attrType
 * @returns {number}
 */
// eslint-ignore-next-line no-unused-vars
function getDateAttr (contact, attrType) {
  const attr = contact.attributes.find(a => a.attribute_type === attrType)

  assert(attr, `Contact attr. not found for type: ${attrType}`)
  assert.equal(typeof attr.date, 'number', `Invalid date value: ${attr.date}`)

  return attr.date
}

/**
 * @param {UUID} brandId
 * @param {string} attrType
 */
async function getContactsHavingAttribute (brandId, attrType) {
  return Contact.getForBrand(brandId, [{
    attribute_type: attrType,
    invert: true,
    value: null,
  }])
}

/**
 * @param {object} options
 * @param {UUID} options.brandTemplateId
 * @param {UUID} options.userId
 * @param {UUID} options.brandId
 * @param {IContact[]} options.contacts
 * @returns {Promise<string[]>}
 */
async function getHtml ({
  brandTemplateId,
  userId,
  brandId,
  contacts,
}) {
  if (!brandTemplateId || !contacts?.length) { return [] }
  
  const brandTemplate = await BrandTemplate.get(brandTemplateId)
  const template = await Template.get(brandTemplate.template)
  const parentBrands = await Brand.getParents(brandId).then(Brand.getAll)
  const user = await User.get(userId)

  const renderOptions = {
    html: (await downloadFile(template.file)).toString(),
    template: await Template.get(template.id),
    brand: parentBrands.reverse().find(pb => pb.brand_type === Brand.BROKERAGE),
  }

  const render = variables => renderTemplate({
    ...renderOptions, variables, palette: null,
  })
  
  if (!template.inputs.includes('contact')) {
    const rendered = await render({ user })
    return contacts.map(() => rendered)
  }

  return Promise.all(contacts.map(contact => render({ user, contact })))
}

/**
 * Filter contacts and returns only contacts without trigger for eventType
 * @param {UUID} brandId
 * @param {IContact[]} contacts
 * @param {string} eventType
 * @returns {Promise<IContact[]>}
 */
async function filterContactsWithoutTrigger (brandId, contacts, eventType) {
  /** @type {any[]} */
  const triggers = await Trigger.getPendingContactTriggers({
    contactIds: contacts.map(c => c.id),
    action: 'schedule_email',
    eventType,
    brandId,
  }).then(Trigger.getAll)

  return contacts.filter(c => triggers.every(t => t.contact !== c.id))
}

/**
 * @param {BrandTrigger} brandTrigger
 * @param {IContact[]} contacts
 * @returns {Promise<UUID[]>}
 */
async function createCampaigns (brandTrigger, contacts) {
  const htmls = await getHtml({
    brandTemplateId: brandTrigger.template,
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
 * @typedef {import('../../Trigger/trigger').ITriggerInput} ITriggerInput
 * @param {BrandTrigger} brandTrigger
 * @param {IContact[]} contacts
 * @param {UUID[]} campaignIds
 * @returns {Promise<UUID[]>}
 */
async function createTriggers (brandTrigger, contacts, campaignIds) {
  assert.equal(contacts.length, campaignIds.length)
  
  /** @type {(_: [IContact, UUID]) => ITriggerInput} */
  const mapper = ([contact, campaignId]) => ({
    action: 'schedule_email',

    brand: brandTrigger.brand,
    event_type: brandTrigger.event_type,
    created_by: brandTrigger.created_by,
    user: brandTrigger.created_by,
    wait_for: brandTrigger.wait_for,
    
    campaign: campaignId ?? assert.fail('Impossible state: nil campaign ID'),
    contact: contact?.id ?? assert.fail('Impossible state: nil contact ID'),

    time: '08:00:00', // XXX: How to specify the time
  })
  
  const zipped = /** @type {[IContact, UUID][]} */(zip(contacts, campaignIds))
  return Trigger.create(zipped.map(mapper))
}

/**
 * @param {UUID} brandTriggerId
 * @param {boolean} overrideManualTriggers
 */
async function createTriggersHandler (brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) { return }

  let contacts = await getContactsHavingAttribute(bt.brand, bt.event_type)
  if (!contacts.length) { return }

  if (overrideManualTriggers) {
    const contactIds = contacts.map(c => c.id)
    await Trigger.deleteForContacts(contactIds, bt.created_by, bt.brand)

    // XXX: What about the email campaigns?
  } else {
    contacts = await filterContactsWithoutTrigger(
      bt.brand,
      contacts,
      bt.event_type
    )
    if (!contacts.length) { return }
  }

  const campaignIds = await createCampaigns(bt, contacts)
  await createTriggers(bt, contacts, campaignIds)  
}

/**
 * @param {UUID} brandTriggerId
 * @param {boolean} overrideManualTriggers
 */
async function updateTriggersHandler (brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) { return }

  let contacts = await getContactsHavingAttribute(bt.brand, bt.event_type)
  if (!contacts.length) { return }

  const triggers = await Trigger.getPendingContactTriggers({
    brandId: bt.brand,
    contactIds: contacts.map(c => c.id),
    eventType: bt.event_type,
    action: 'schedule_email',
  }).then(Trigger.getAll)

  if (overrideManualTriggers) {
    await Trigger.delete(triggers.map(t => t.id), bt.created_by)
  } else {
    contacts = chain(/** @type {any[]} */(triggers))
          .reject({ origin: bt.id })
          .map('contact')
          .thru(ids => new Set(ids))
          .thru(set => contacts.filter(c => !set.has(c.id)))
          .value()
  }

  const campaignIds = await createCampaigns(bt, contacts)
  await createTriggers(bt, contacts, campaignIds)  
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
