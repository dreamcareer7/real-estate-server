const _ = require('lodash')

const Orm = require('../Orm')
const Contact = require('../Contact')
const ContactAttributeDef = require('../Contact/attribute_def')

const IMPORTED_FROM_OUTLOOK = 'External/Outlook'

/**
 * Fetches attribute defs for a user
 * @param {UUID} brand_id 
 * @returns {Promise<Record<string, IContactAttributeDef>>}
 */
async function originalLoadAttributeDefs(brand_id) {
  const def_ids = await ContactAttributeDef.getForBrand(brand_id)
  const defs = await ContactAttributeDef.getAll(def_ids)
  return _.keyBy(defs, 'name')
}

const loadAttributeDefs = _.memoize(originalLoadAttributeDefs)

async function getCurrentMSGraphContacts(brand_id) {
  const sourceTypeDef = (await loadAttributeDefs(brand_id)).source_type
  const cUsers = await Contact.getForBrand(brand_id, [{
    attribute_def: sourceTypeDef.id,
    text: IMPORTED_FROM_OUTLOOK
  }])

  return Orm.populate({
    models: cUsers,
    associations: ['contact.sub_contacts', 'contact_attribute.attribute_def']
  })
}

async function saveContacts(user_id, brand_id, data) {
  const prepared = await prepareData(brand_id, data)

  return Contact.create(prepared, user_id, brand_id, {
    activity: false,
    get: false,
    relax: true
  })
}

async function addAttributeToContactForUser(user_id, contactProps) {
  const prepared = await prepareData(user_id, contactProps, false)

  return Contact.update(user_id, prepared, true)
}

async function prepareData(brand_id, data, addSystemAttrs = true) {
  if (_.isEmpty(data)) {
    return []
  }
  const defsByName = await loadAttributeDefs(brand_id)
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