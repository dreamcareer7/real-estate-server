const { groupBy } = require('lodash')
const qs = require('querystring')

const GoogleContact    = require('../../contact')
const ContactAttribute = require('../../../Contact/attribute/get')
const Contact          = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate'),
}

const { parseAttributes, parseFeed } = require('./helper')
const { findNewAttributes } = require('./attributes')
const { extractPhoto }   = require('./photo')

const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']



const buildGoogleApiPath = (lastSyncAt) => {
  lastSyncAt = new Date(lastSyncAt)
  lastSyncAt.setHours(lastSyncAt.getHours() - 1)

  const query = {
    'v': '3.0',
    'alt': 'json',
    'showdeleted': false,
    'max-results': 1000,
    'updated-min': new Date(lastSyncAt).toISOString()
  }

  const path = `/m8/feeds/contacts/default/full?${qs.stringify(query)}`

  return path
}

const syncContacts = async (google, credential, lastSyncAt) => {
  const credentialId = credential.id
  const brand        = credential.brand
  const user         = credential.user
  
  const records            = []
  const toUpdateRecords    = []
  const newContacts        = []
  const toUpdateContacts   = []
  const toUpdateContactIds = []
  const contactsMap        = {}

  let createdNum = 0

  try {

    const path    = buildGoogleApiPath(lastSyncAt)
    const entries = await google.getContacts(path)

    if (entries.length) {
      const contacts = await parseFeed(entries)
  
      const entryIdsArr              = contacts.map(c => c.entry_id)
      const oldGoogleContacts        = await GoogleContact.getAll(entryIdsArr, credentialId)
      const contactGroups            = await GoogleContact.getRefinedContactGroups(credentialId)
      const oldGoogleContactEntryIds = oldGoogleContacts.map(c => c.entry_id)


      // Updated Contacts
      for (const contact of contacts) {
        if ( oldGoogleContactEntryIds.includes(contact.entry_id) ) {

          const oldGContact = await GoogleContact.get(contact.entry_id, credentialId)

          if ( !oldGContact.deleted_at ) {

            const parked = oldGContact.entry.groupMembership ? false : true
            const result = await Contact.fastFilter(brand, [], { google_id: oldGContact.id, parked })

            if (result.ids[0]) {
              toUpdateContactIds.push(result.ids[0])

              contactsMap[result.ids[0]] = { rawData: contact, oldRawData: oldGContact.entry }
            }

            toUpdateRecords.push({ google_credential: credentialId, entry_id: contact.entry_id, entry: JSON.stringify(contact) })
          }

        } else {

          records.push({ google_credential: credentialId, entry_id: contact.entry_id, entry: JSON.stringify(contact) })
        }
      }

      if ( toUpdateContactIds.length ) {
        const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
        const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact})
  
        for (const key in refinedAtts) {
          const newAttributes = findNewAttributes(contactsMap[key], refinedAtts[key])

          if (newAttributes.length) {
            const synceddata = contactsMap[key].rawData
            const parked     = synceddata.groupMembership ? false : true
            toUpdateContacts.push({ id: key, parked, attributes: newAttributes })
          }
        }
      }

      // New Contacts
      const createdGoogleContacts = await GoogleContact.create(records)
  
      for (const cgc of createdGoogleContacts) {
  
        /** @type {IContactInput} */
        const contact = {
          user: user,
          google_id: cgc.id,
          attributes: [{ attribute_type: 'source_type', text: 'Google' }],
          parked: cgc.entry.groupMembership ? false : true
        }

        for (const key in cgc.entry) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = parseAttributes(key, cgc.entry, contactGroups)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }
  
        newContacts.push(contact)
      }


      // Updated Contacts
      await GoogleContact.create(toUpdateRecords)
      await Contact.update(toUpdateContacts, user, brand, 'google_integration')

      // New Contacts
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

      createdNum = createdGoogleContacts.length
    }

    return {
      status: true,
      ex: null,
      createdNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

const syncAvatars = async (google, credential) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateGoogleContacts = []
  const toUpdateContacts       = []

  const helper = async (gcontact) => {
    const file  = await extractPhoto(google, user, brand, gcontact)
    const photo = file ? file.url : null

    const google_credential = gcontact.google_credential
    const entry_id = gcontact.entry_id

    toUpdateGoogleContacts.push({ google_credential, entry_id, photo, processed_photo: true })

    if (photo) {
      const result = await Contact.fastFilter(brand, [], { google_id: gcontact.id })
      const relevantContactId = result.ids[0]

      if (!relevantContactId) {
        return
      }
  
      const attributes = []
      attributes.push({ attribute_type: 'profile_image_url', text: photo })
      attributes.push({ attribute_type: 'cover_image_url', text: photo })

      toUpdateContacts.push({ id: relevantContactId, attributes })
    }    
  }

  try {

    const googleContacts = await GoogleContact.filter({ google_credential: credential.id, processed_photo: false })

    if ( googleContacts.length === 0 ) {
      return {
        status: true
      }
    }

    let promises = []

    for (const gcontact of googleContacts) {
      promises.push(helper(gcontact))

      if ( promises.length && (promises.length % 3 === 0) ) {
        await Promise.all(promises)
        promises = []
      }
    }

    if (promises.length) {
      await Promise.all(promises)
      promises = []
    }

    // Updated Contacts
    await GoogleContact.bulkUpdate(toUpdateGoogleContacts)
    await Contact.update(toUpdateContacts, user, brand, 'google_integration')

    return {
      status: true
    }

  } catch (ex) {
  
    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncContacts,
  syncAvatars
}
