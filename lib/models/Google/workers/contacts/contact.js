const { groupBy } = require('lodash')
const qs = require('querystring')

const GoogleContact    = require('../../contact')
const Contact          = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate'),
}
const ContactAttribute = require('../../../Contact/attribute/get')

const { parseAttributes, parseFeed } = require('./helper')
const { extractPhoto }      = require('./photo')
const { findNewAttributes } = require('./attributes')

const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']

const debugArr = ['370a7926-a97e-4f34-9929-c3cbaf0eb133', '25caadda-8750-4122-bee2-c364b034939e']
const Context  = require('../../../Context')


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

    if ( debugArr.includes(credential.id) ) {
      Context.log('*** syncContacts', credential.id)
    }

    const path    = buildGoogleApiPath(lastSyncAt)
    const entries = await google.getContacts(path)

    if ( debugArr.includes(credential.id) ) {
      Context.log('*** syncContacts path', path)
      Context.log('*** syncContacts entries.length', entries.length)
    }

    if (entries.length) {
      const contacts = await parseFeed(entries)

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts parseFeed done - contacts.length', contacts.length)
      }

      for (const contact of contacts) {
        if (!contact.photo) {
          continue
        }
  
        const file = await extractPhoto(google, user, brand, contact)
        contact.photo = file ? file.url : null
      }
  
      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts after proccessing photos')
      }

      const entryIdsArr              = contacts.map(c => c.entry_id)
      const oldGoogleContacts        = await GoogleContact.getAll(entryIdsArr, credentialId)
      
      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts GoogleContact.getAll done', oldGoogleContacts?.length)
      }

      const contactGroups            = await GoogleContact.getRefinedContactGroups(credentialId)

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts GoogleContact.getRefinedContactGroups done', contactGroups?.length)
      }

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

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts after loop 1')
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

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts after loop 2')
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

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts after loop 3')
      }


      // Updated Contacts
      await GoogleContact.create(toUpdateRecords)

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts GoogleContact.create done')
      }

      await Contact.update(toUpdateContacts, user, brand, 'google_integration')

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts Contact.update done')
      }


      // New Contacts
      await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

      if ( debugArr.includes(credential.id) ) {
        Context.log('*** syncContacts create.update done')
      }

      createdNum = createdGoogleContacts.length
    }

    if ( debugArr.includes(credential.id) ) {
      Context.log('*** syncContacts before return')
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


module.exports = {
  syncContacts
}
