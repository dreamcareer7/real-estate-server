const { groupBy, keyBy } = require('lodash')

const GoogleContact    = require('../../../../contact')
const ContactAttribute = require('../../../../../Contact/attribute/get')
const Contact = {
  ...require('../../../../../Contact/fast_filter'),
  ...require('../../../../../Contact/manipulate'),
}

const { parseAttributes, findNewAttributes } = require('./attributes')
const { targetKeys } = require('./constants')


const processContacts = async (credential, contacts, parked) => {
  const newGoogleContacts     = []
  const updatedGoogleContacts = []

  const newContacts      = []
  const updateContactIds = []
  const updatedContacts  = []

  const contactsMap = {}


  const entryIdsArr       = contacts.map(c => c.entry_id)
  const oldGoogleContacts = await GoogleContact.getByEntryIds(credential.id, entryIdsArr)
  const contactGroups     = await GoogleContact.getRefinedContactGroups(credential.id)
  
  const oldGoogleContactEntryIds   = oldGoogleContacts.map(c => c.entry_id)
  const oldGoogleContactsByEntryId = keyBy(oldGoogleContacts, 'entry_id')

  for (const contact of contacts) {
    const temp = {
      google_credential: credential.id,
      entry_id: contact.entry_id,

      etag: contact.etag,
      resource_id: contact.resource_id,
      resource: JSON.stringify(contact),
      parked
    }

    if ( oldGoogleContactEntryIds.includes(contact.entry_id) ) {

      const oldGContact = oldGoogleContactsByEntryId[contact.entry_id]
      const result      = await Contact.fastFilter(credential.brand, [], { google_id: oldGContact.id, parked: oldGContact.parked })

      if (result.ids[0]) {
        updateContactIds.push(result.ids[0])
        contactsMap[result.ids[0]] = { contact, oldGContact }
      }

      // Updated Contacts
      updatedGoogleContacts.push(temp)

    } else {
      
      // New Contacts
      newGoogleContacts.push(temp)
    }
  }

  if ( updateContactIds.length ) {
    const contactsAtts = await ContactAttribute.getForContacts(updateContactIds)
    const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact })

    for (const id in refinedAtts) {
      const attributes = findNewAttributes(contactsMap[id], refinedAtts[id])

      if (attributes.length) {
        updatedContacts.push({ id, attributes, parked })
      }
    }
  }

  const createdGoogleContacts = await GoogleContact.create(newGoogleContacts)

  for (const cgc of createdGoogleContacts) {

    /** @type {IContactInput} */
    const contact = {
      user: credential.user,
      google_id: cgc.id,
      attributes: [{ attribute_type: 'source_type', text: 'Google' }],
      parked
    }

    for (const key in cgc.resource) {
      if (targetKeys.indexOf(key) >= 0) {
        const attributes   = parseAttributes(key, cgc.resource, contactGroups)
        contact.attributes = contact.attributes.concat(attributes)
      }
    }

    newContacts.push(contact)
  }

  await GoogleContact.create(updatedGoogleContacts)
  await Contact.update(updatedContacts, credential.user, credential.brand, 'google_integration')
  await Contact.create(newContacts, credential.user, credential.brand, 'google_integration', { activity: false, relax: true, get: false })

  return createdGoogleContacts.length
}


module.exports = {
  processContacts
}