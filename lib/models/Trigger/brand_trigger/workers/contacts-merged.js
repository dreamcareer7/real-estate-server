const uniq = require('lodash/uniq')
const Orm = require('../../../../../lib/models/Orm/context')
const BrandTrigger = require('../get')
const Contact = {
  ...require('../../../Contact/get'),
  ...require('../../../Contact/render-template'),
}
const ContactAttribute = require('../../../Contact/attribute/get')
const {
  createCampaignsAndTriggers,
  extractContactIds,
  filterTriggers,
} = require('./utils')

/** @typedef {import('../../../Trigger/brand_trigger/types').BrandTrigger} BrandTrigger */

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
  
  const contactAttributes = await ContactAttribute.getForContacts(contact_ids)

  const triggers = await filterTriggers({
    event_type: uniq(bts.map((bt) => bt.event_type)),
    contacts: contact_ids,
    brand: brand_id,
  })

  /**
	 * @typedef {Map<BrandTrigger, IContact['id'][]>} ContactIdsMap
	 * @type {(_: ContactIdsMap, __: BrandTrigger) => ContactIdsMap }
	*/
  function toContactIdsMap(map, bt) {
    let cids = uniq(
      contactAttributes
        .filter(ca => ca.attribute_type === bt.event_type)
        .map(ca => ca.contact)
    )

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

module.exports = {
  contactsMerged,
}