const _ = require('lodash')
const loadAttributeDefs = require('./db-adapter').loadAttributeDefs
const {AddressIndexHelper} = require('./util')
const ADDRESSES_INDEX_INITIAL_VALUE = 1
const IMPORTED_FROM_OUTLOOK = 'External/Outlook'
const SOURCE_TYPE = 'source_type'

// This function provide attr. defs for those attributes that need updaing, not being added to 
async function getPartOfAttributeDefs(attrNames = []) {
  const all = await loadAttributeDefs()
  return _.pick(all, attrNames)
}

async function compareAll(currentContacts, newContacts) {

  const totallyNew = []
  const addAttribute = []

  // These attributes should be updated if imported before and not duplicated with new values
  const updateableAttrDefs = _.keyBy(await getPartOfAttributeDefs([
    'birthday',
    'first_name',
    'last_name',
    'nickname',
    'middle_name',
    'title',
    'last_modified_on_source'
  ]), 'id')

  const addressParts = [
    'city',
    'street_name',
    'country',
    'postal_code',
    'state'
  ]

  const addressPartsAttrDefs = _.keyBy(await getPartOfAttributeDefs(addressParts), 'id')

  // Find all subcontacts that are imported from outlook
  const allOutlook = []
  for (const cc of currentContacts) {
    for (const subCon of cc.sub_contacts) {
      const outlookContact = subCon.attributes.find(a => a.attribute_type === SOURCE_TYPE && a.text === IMPORTED_FROM_OUTLOOK)
      outlookContact && allOutlook.push(Object.assign(subCon.attributes, {contactID: subCon.id}))
    }
  }

  // Let's loop for each new contact and see  what does it have for us
  newContacts.forEach(newContact => {
    
    const newSourceID = _.get(newContact, 'source_id.0.text', '')

    // Find old contact that has the same sourceID
    let matchedOldContact = allOutlook.find(ol => {
      return ol.find(attr => attr.attribute_type === 'source_id').text === newSourceID
    })

    // If no old contact is found, we add it into Rechat and return from this function
    if (_.isNil(matchedOldContact)) {
      return totallyNew.push(newContact)
    }

    // Save contactID since we are going to need it soon
    const matchedOldContactContactID = matchedOldContact.contactID
    matchedOldContact = _.groupBy(matchedOldContact, 'attribute_type')
    const maxAddressesIndex = findMaxIndex(addressParts, matchedOldContact)
    const addressHelper = new AddressIndexHelper(maxAddressesIndex + 1)

    // Great, we already have that data and nothing is changed, so return
    if (matchedOldContact.last_modified_on_source[0].date === newContact.last_modified_on_source[0].date) {
      return
    }

    const currentContactAttrsToAdd = []

    // Here we state which contacts our attributes are going to be added to
    currentContactAttrsToAdd.id = matchedOldContactContactID

    // So the real game begins; To find what were changed, added etc.
    for (const newContactKey in newContact) {
      if (!newContact.hasOwnProperty(newContactKey)) {
        return
      }

      const newContactValueArr = newContact[newContactKey]

      if (!_.isArray(newContactValueArr)) {
        return
      }

      for (const newVal of newContactValueArr) {
        // We find all values we already have for new value that has came into rechat 
        const foundOldAttrsArr = _.get(matchedOldContact, newContactKey, []).filter(oldVal =>
          oldVal.attribute_def === newVal.attribute_def
        )

        // We have not found an attribute with the attribeute def, so attribute is new
        if (_.isEmpty(foundOldAttrsArr)) {
          const obj = {
            attribute_def: newVal.attribute_def,
            label: newVal.label
          }

          if (addressPartsAttrDefs[newVal.attribute_def]) {
            obj.index = addressHelper.getIndexFor(newVal.label)
          }

          newVal.text && (obj.text = newVal.text)
          newVal.date && (obj.date = newVal.date)
          newVal.number && (obj.number = newVal.number)
          currentContactAttrsToAdd.push(obj)
          continue
        }

        // Now we find the old value that we have which exactly matches the value of our new value
        const foundOldAttr = foundOldAttrsArr.find(foundOldAttr => {
          return (!_.isEmpty(foundOldAttr.text) && foundOldAttr.text === newVal.text) ||
            (!_.isEmpty(foundOldAttr.date) && foundOldAttr.date === newVal.date) ||
            (!_.isEmpty(foundOldAttr.number) && foundOldAttr.number === newVal.number)
        })


        if (_.isEmpty(foundOldAttr)) {
          // If we reached here, it means we have the attribute in system, but the the value is somehow changed.
          // For some attributes we should just add new value to system, but for some other we should update the value on Rechat
          const obj = {
            attribute_def: newVal.attribute_def,
            label: newVal.label
          }

          if (updateableAttrDefs[newVal.attribute_def]) {
            const attrID = _.get(foundOldAttrsArr, '0.id', '')
            obj.id = attrID
          }

          if (addressPartsAttrDefs[newVal.attribute_def]) {
            obj.index = addressHelper.getIndexFor(newVal.label)
          }

          newVal.text && (obj.text = newVal.text)
          newVal.date && (obj.date = newVal.date)
          newVal.number && (obj.number = newVal.number)
          currentContactAttrsToAdd.push(obj)
          continue
        }
      }
    }
    addAttribute.push(currentContactAttrsToAdd)
  })
  return {
    addAttribute,
    totallyNew
  }
}

function findMaxIndex(addressParts, oldContactAttrs) {
  let maxIndex = ADDRESSES_INDEX_INITIAL_VALUE - 1

  addressParts.forEach(ap => {
    _.get(oldContactAttrs, ap, []).forEach(p => {
      maxIndex = (_.get(p, 'index', 0)) > maxIndex ? p.index : maxIndex
    })
  })

  return maxIndex
}

module.exports = {
  compareAll
}