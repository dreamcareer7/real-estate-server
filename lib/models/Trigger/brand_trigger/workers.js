const { strict: assert } = require('assert')
const keyBy = require('lodash/keyBy')
const uniq = require('lodash/uniq')
const zip = require('lodash/zip')

const Orm = require('../../../../lib/models/Orm/context')
const BrandTemplate = require('../../Template/brand/get')
const Campaign = require('../../Email/campaign/create')
const { peanar } = require('../../../utils/peanar')
const Email = require('../../Email/constants')
const Contact = {
  ...require('../../Contact/get'),
  ...require('../../Contact/render-template'),
}
const BrandTrigger = {
  ...require('./get'), 
  ...require('./exclusions')
}
const Trigger = {
  ...require('../create'),
  ...require('../delete'),
  ...require('../filter'),
  ...require('../get'),
}

/** @typedef {import('../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */
/** @typedef {import('../../Trigger/trigger').ITriggerInput} ITriggerInput */
/** @typedef {import('../../Trigger/trigger').IContactTrigger} IContactTrigger */

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
 * @param {IContact[]} contacts
 * @param {IContactAttribute['attribute_type']} attrType
 * @returns {IContact[]}
 */
function findContactsWithAttr(contacts, attrType) {
  return contacts.filter((c) => c.attributes.some((a) => a.attribute_type === attrType))
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
async function filterAttributesHavingNoTrigger(brandId, attributes) {
  const triggers = await filterTriggers({
    event_type: uniq(attributes.map((a) => a.attribute_type)),
    contacts: uniq(attributes.map((a) => a.contact)),
    brand: brandId,
  })
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

/**
 * @param {UUID} brandTriggerId
 * @param {boolean | undefined} [overrideManualTriggers]
 */
async function updateTriggersHandler(brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) {
    return
  }
  
  let triggerIdsToRemove

  if (overrideManualTriggers) {
    triggerIdsToRemove = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
    })
    
  }
  
  else {
    const manualTriggerIds = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
      origin: null,
    })
    const manualTriggers = await Trigger.getAll(manualTriggerIds)
    const exclusions = await BrandTrigger.getExclusions(bt.brand, bt.event_type)
    await BrandTrigger.makeExclusion(
      bt.brand,
      bt.event_type,
      manualTriggers
        .filter(trigger=>!exclusions.find(excl=>excl.contact === trigger.contact))
        .map(trigger => trigger.contact)
    )
    triggerIdsToRemove = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
      origin: true,
    })
  }

  if (triggerIdsToRemove.length) {
    await Trigger.delete(triggerIdsToRemove, bt.created_by)
  }

  const contactIds = await BrandTrigger.getContactIdsToCreateTriggerFor({
    brandId: bt.brand,
    eventType: bt.event_type,
  })
  if (!contactIds.length) {
    return
  }

  await createCampaignsAndTriggers(bt, contactIds)
}

/**
 * @param {object} args
 * @param {IBrand['id']} args.brand
 * @param {IContactAttributeInputWithContact[]} args.attributes
 */
async function dateAttributesCreated({ brand: brandId, attributes }) {
  const bts = await BrandTrigger.getForBrand(brandId)
  if (!bts.length) {
    return
  }

  attributes = await filterAttributesHavingNoTrigger(brandId, attributes)
  if (!attributes?.length) {
    return
  }

  const manualTriggerIds = await Trigger.filter({
    ...COMMON_TRIGGER_FILTERS,
    brand: brandId,
    event_type: [attributes.map(attr=>attr.attribute_type)],
    origin: null,
  })
  const manualTriggers = await Trigger.getAll(manualTriggerIds)

  const brandTriggerMap = new Map(Object.entries(keyBy(bts, 'event_type')))

  const contactIdMap = 
    attributes.reduce((map, { attribute_type, contact }) => {
      const bt = attribute_type && brandTriggerMap.get(attribute_type)
      if (!bt) {
        return map
      }

      const attrs = map.get(bt)
      if (!attrs) {
        return map.set(bt, [contact])
      }

      attrs.push(contact)
      return map
    }, new Map())

  let contactsToExclude = []
  let contactsToCreateTriggersFor = []
  for (const [bt, contactIds] of contactIdMap.entries()) {
    contactsToExclude = []
    contactsToCreateTriggersFor = []
    contactIds.forEach(contactId => {
      const existingSameTrigger = manualTriggers.find(
        trigger => trigger.contact === contactId
        && bt.event_type === trigger.event_type
      )
      if (existingSameTrigger) {
        contactsToExclude.push(contactId)
      } else {
        contactsToCreateTriggersFor.push(contactId)
      }
    })
    await BrandTrigger.deleteExclusion(bt.brand, bt.event_type, contactsToExclude)    
    await BrandTrigger.makeExclusion(bt.brand, bt.event_type, contactsToExclude)
    await createCampaignsAndTriggers(bt, contactsToCreateTriggersFor)
  }
}

/**
 * @typedef {'id' | 'contact' | 'attribute_type' | 'date'} DeleteAttrKey
 * @param {object} args
 * @param {Pick<IContactAttribute, DeleteAttrKey>[]} args.attributes
 * @param {IUser['id']} args.userId
 */
async function dateAttributesDeleted({ attributes, userId }) {
  const triggerIds = await Trigger.filter({
    ...COMMON_TRIGGER_FILTERS,
    event_type: uniq(attributes.map((a) => a.attribute_type)),
    contacts: uniq(attributes.map((a) => a.contact)),
  })

  if (triggerIds?.length) {
    await Trigger.delete(triggerIds, userId)
  }
}

/**
 * @param {object} args
 * @param {IUser['id']} args.user_id
 * @param {IBrand['id']} args.brand_id
 * @param {IContact['id'][]} args.contact_ids
 * @param {'merge'} args.event_type
 */
async function contactsMerged({ brand_id, contact_ids }) {
  const bts = await BrandTrigger.getForBrand(brand_id)
  if (!bts?.length) {
    return
  }

  Orm.enableAssociation('contact.attributes')
  const contacts = await Contact.getAll(contact_ids)
  if (!contacts?.length) {
    return
  }

  const triggers = await filterTriggers({
    event_type: uniq(bts.map((bt) => bt.event_type)),
    contacts: contact_ids,
    brand: brand_id,
  })
  if (!triggers?.length) {
    return
  }

  /**
   * @typedef {Map<BrandTrigger, IContact['id'][]>} ContactIdsMap
   * @type {(_: ContactIdsMap, __: BrandTrigger) => ContactIdsMap }
   */
  function toContactIdsMap(map, bt) {
    let cids = findContactsWithAttr(contacts, bt.event_type).map((c) => c.id)
    if (!cids.length) {
      return map.set(bt, cids)
    }

    const contactIdsWithTrigger = extractContactIds(triggers, bt.event_type)
    cids = cids.filter((cid) => !contactIdsWithTrigger.has(cid))

    return map.set(bt, cids)
  }

  const contactIdsMap = bts.reduce(toContactIdsMap, new Map())

  for (const [bt, contactIds] of contactIdsMap.entries()) {
    await createCampaignsAndTriggers(bt, contactIds)
  }
}

/**
 * @param {object} args
 * @param {IBrand['id']} args.brand_id
 * @param {UUID} args.trigger_id
 * @param {IContact['id']} args.contact_id
 */
async function flowExecuted({brand_id, trigger_id, contact_id}) {
  const bts = await BrandTrigger.getForBrand(brand_id)
  if (!bts.length) {
    return
  }
  const trigger = await Trigger.get(trigger_id)
  if (trigger.recurring) {
    return
  }
  const bt = bts.find(bt => bt.event_type === trigger.event_type)
  if (!bt) {
    return
  }
  await createCampaignsAndTriggers(bt, [contact_id])
}

module.exports = {
  updateTriggers: peanar.job({
    handler: updateTriggersHandler,
    name: 'brand_trigger/update_triggers',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),

  // FIXME : use better names
  dateAttributesCreated: peanar.job({
    handler: dateAttributesCreated,
    name: 'brand_trigger/on_date_attribute_created',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),

  dateAttributesDeleted: peanar.job({
    handler: dateAttributesDeleted,
    name: 'brand_trigger/on_date_attribute_deleted',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),

  contactsMerged: peanar.job({
    handler: contactsMerged,
    name: 'brand_trigger/on_contacts_merged',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error',
  }),

  flowExecuted: peanar.job({
    handler: flowExecuted,
    name: 'brand_trigger/on_trigger_effectively_executed',
    queue: 'brand_trigger',
    exchange: 'brand_trigger',
    error_exchange: 'brand_trigger.error'
  })
}
