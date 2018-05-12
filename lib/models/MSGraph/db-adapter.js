const _ = require('lodash')

const Contact = require('../Contact')
const ContactAttributeDef = require('../Contact/attribute_def')

const IMPORTED_FROM_OUTLOOK = 'External/Outlook'

/**
 * Fetches attribute defs for a user
 * @param {UUID} userID 
 * @returns {Promise<Record<string, IContactAttributeDef>>}
 */
async function originalLoadAttributeDefs(userID) {
  const def_ids = await ContactAttributeDef.getForUser(userID)
  const defs = await ContactAttributeDef.getAll(def_ids)
  return _.keyBy(defs, 'name')
}

const loadAttributeDefs = _.memoize(originalLoadAttributeDefs)

async function getCurrentMSGraphContacts(userID) {
  const sourceTypeDef = (await loadAttributeDefs(userID)).source_type
  let cUsers = await Contact.getForUser(userID, [{
    attribute_def: sourceTypeDef.id,
    text: IMPORTED_FROM_OUTLOOK
  }])

  return Orm.populate({
    models: cUsers,
    associations: ['contact.sub_contacts', 'sub_contact.attributes', 'contact_attribute.attribute_def']
  })
}

async function saveContacts(userID, data) {
  const prepared = await prepareData(userID, data)

  return Contact.create(userID, prepared, {
    activity: false,
    get: false,
    relax: true
  })
}

async function addAttributeToContactForUser(userID, contactProps) {
  const prepared = await prepareData(userID, contactProps, false)

  return Contact.update(userID, prepared, true)
}

async function prepareData(userID, data, addSystemAttrs = true) {
  if (_.isEmpty(data)) {
    return
  }
  const defsByName = await loadAttributeDefs(userID)
  const systemAttributes = [{
    attribute_def: defsByName['source_type'].id,
    text: IMPORTED_FROM_OUTLOOK
  }, {
    attribute_def: defsByName['stage'].id,
    text: 'General'
  }]

  const flattenAttrs = []
  for (const [idx, cvd] of data.entries()) {
    for (const [idx2, val] of Object.entries(cvd)) {
      if (idx2 === 'id') continue
      flattenAttrs[idx] = flattenAttrs[idx] || {
        attributes: []
      }
      flattenAttrs[idx].attributes = flattenAttrs[idx].attributes.concat(val)
    }
    // This is needed to avoid any call/access by reference 
    if (addSystemAttrs) {
      flattenAttrs[idx].attributes = flattenAttrs[idx].attributes.concat(_.cloneDeep(systemAttributes))
    }

    flattenAttrs[idx].id = cvd.id
  }

  return flattenAttrs
}

module.exports = {
  saveContacts,
  getCurrentMSGraphContacts,
  addAttributeToContactForUser,
  loadAttributeDefs
}