const uniq = require('lodash/uniq')
const Trigger = {
  ...require('../../delete'),
  ...require('../../filter'),
}
const {COMMON_TRIGGER_FILTERS} = require('./utils')

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
  
module.exports = {
  dateAttributesDeleted,
}