const uniq = require('lodash/uniq')
const Orm = require('../../../../../lib/models/Orm/context')
const BrandTrigger = require('../get')
const Contact = {
  ...require('../../../Contact/get'),
  ...require('../../../Contact/render-template'),
}
const {
  createCampaignsAndTriggers,
  extractContactIds,
  filterTriggers,
  findContactsWithAttr,
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

module.exports = {
  contactsMerged,
}