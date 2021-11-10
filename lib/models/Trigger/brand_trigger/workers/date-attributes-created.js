const keyBy = require('lodash/keyBy')
const BrandTrigger = require('../get')
const BrandTriggerExclusion = require('../exclusion/create')
const Trigger = {
  ...require('../../filter'),
  ...require('../../get'),
}
const {
  COMMON_TRIGGER_FILTERS,
  filterAttributesHavingNoTrigger,
  createCampaignsAndTriggers,
} = require('./utils')

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
      
    await BrandTriggerExclusion.create(bt.brand, bt.event_type, contactsToExclude)
  
    await createCampaignsAndTriggers(bt, contactsToCreateTriggersFor)
  }
}

module.exports = { 
  dateAttributesCreated,
}