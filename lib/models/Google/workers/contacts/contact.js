const { groupBy, keyBy } = require('lodash')

const GoogleContact    = require('../../contact')
const ContactAttribute = require('../../../Contact/attribute/get')
const Contact          = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate'),
}

const { refineConnections, refineOtherContacts } = require('./refine')
const { parseAttributes, findNewAttributes } = require('./attributes')

const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']


const syncContacts = async (google, credential) => {
  const credentialId = credential.id
  const brand = credential.brand
  const user  = credential.user
  
  const newGoogleContacts     = []
  const updatedGoogleContacts = []

  const newContacts      = []
  const updatedContacts  = []
  const updateContactIds = []
  const contactsMap      = {}

  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const contacts = refineConnections(connections)

    if (!contacts.length) {
      return {
        status: true,
        syncToken
      }
    }

    const entryIdsArr       = contacts.map(c => c.entry_id)
    const oldGoogleContacts = await GoogleContact.getByEntryIds(credentialId, entryIdsArr)
    const contactGroups     = await GoogleContact.getRefinedContactGroups(credentialId)
    
    const oldGoogleContactEntryIds   = oldGoogleContacts.map(c => c.entry_id)
    const oldGoogleContactsByEntryId = keyBy(oldGoogleContacts, 'entry_id')

    for (const contact of contacts) {
      const temp = {
        google_credential: credential.id,
        entry_id: contact.entry_id,

        etag: contact.etag,
        resource_id: contact.resource_id,
        resource: JSON.stringify(contact),
        other: false
      }

      if ( oldGoogleContactEntryIds.includes(contact.entry_id) ) {

        const oldGContact = oldGoogleContactsByEntryId[contact.entry_id]
        const result      = await Contact.fastFilter(brand, [], { google_id: oldGContact.id, parked: false })

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
      const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact})

      for (const key in refinedAtts) {
        const newAttributes = findNewAttributes(contactsMap[key], refinedAtts[key])

        if (newAttributes.length) {
          updatedContacts.push({ id: key, attributes: newAttributes, parked: false })
        }
      }
    }

    const createdGoogleContacts = await GoogleContact.create(newGoogleContacts)

    for (const cgc of createdGoogleContacts) {

      /** @type {IContactInput} */
      const contact = {
        user,
        google_id: cgc.id,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }],
        parked: false
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
    await Contact.update(updatedContacts, user, brand, 'google_integration')
    await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })


    return {
      status: true,
      syncToken,
      createdNum: createdGoogleContacts.length
    }

  } catch (ex) {

    console.log('------ ex', ex)

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncContacts
}