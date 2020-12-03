const { groupBy } = require('lodash')
const MicrosoftContact = require('../../contact')
const ContactAttribute = require('../../../Contact/attribute/get')
const Contact = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate')
}

const { parseAttributes, findNewAttributes } = require('./helper')
const { extractPhoto } = require('./photo')

const { targetKeys, projection, fiveXErr, ECONNRESET } = require('./static')



const syncContacts = async (microsoft, credential, lastSyncAt) => {
  const credentialId = credential.id
  const brand = credential.brand
  const user  = credential.user

  const uniqueRec  = []
  const uniqueToUp = []

  const records            = []
  const toUpdateRecords    = []
  const newContacts        = []
  const toUpdateContacts   = []
  const toUpdateContactIds = []
  const contactsMap        = {}

  let createdNum = 0
  let deletedAttributes = []

  try {
    const folders  = await MicrosoftContact.getCredentialFolders(credentialId)
    const contacts = await microsoft.getContactsNative(lastSyncAt, folders, projection)

    if (contacts.length) {

      const remoteIdsArr         = contacts.map(c => c.id)
      const oldMicrosoftContacts = await MicrosoftContact.getAllBySource(remoteIdsArr, credentialId, 'contacts')
      const contactFolders       = await MicrosoftContact.getRefinedContactFolders(credentialId)
      const oldMicrosoftContactRemoteIds = oldMicrosoftContacts.map(c => c.remote_id)

      // Updated Contacts
      for (const contact of contacts) {
        /* store photo as an empty value, then it will be updated in a separate job after fetching avatars remotely */
        contact.photo = ''

        if ( oldMicrosoftContactRemoteIds.includes(contact.id) ) {

          const oldMContact = await MicrosoftContact.get(contact.id, credentialId)

          // This is a temporary change to import tag/category of already synced contacts
          // if ( !oldMContact.deleted_at && (oldMContact.data.changeKey !== contact.changeKey) ) {
          if ( !oldMContact.deleted_at ) {

            const result = await Contact.fastFilter(brand, [], { microsoft_id: oldMContact.id })

            if (result.ids[0]) {
              toUpdateContactIds.push(result.ids[0])

              contactsMap[result.ids[0]] = {
                rawData: contact,
                oldRawData: oldMContact.data,
              }
            }
            
            if ( !uniqueToUp.includes(contact.id) ) {
              uniqueToUp.push(contact.id)
              toUpdateRecords.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
            }
          }          

        } else {

          if ( !uniqueRec.includes(contact.id) ) {
            uniqueRec.push(contact.id)
            records.push({ microsoft_credential: credentialId, remote_id: contact.id, data: JSON.stringify(contact) })
          }
        }
      }

      if ( toUpdateContactIds.length ) {
        const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)        
        const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact})
        // const refinedAtts = groupBy(contactsAtts.filter(att => (!att.deleted_at && att.created_for === 'microsoft_integration')), function(entry) { return entry.contact})

        for (const key in refinedAtts) {
          const { attributes, deletedAtt } = findNewAttributes(contactsMap[key], refinedAtts[key])

          deletedAttributes = deletedAttributes.concat(deletedAtt)

          if (attributes.length) {
            toUpdateContacts.push({ id: key, attributes })
          }
        }
      }

      // New Contacts
      const createdMicrosoftContacts = await MicrosoftContact.create(records)

      for (const createdMicrosoftContact of createdMicrosoftContacts) {
  
        /** @type {IContactInput} */
        const contact = {
          user: user,
          microsoft_id: createdMicrosoftContact.id,
          attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }],
          parked: false
        }
  
        for (const key in createdMicrosoftContact.data) {
          if (targetKeys.indexOf(key) >= 0) {
            const attributes = parseAttributes(key, createdMicrosoftContact.data, contactFolders)
            contact.attributes = contact.attributes.concat(attributes)
          }
        }
  
        newContacts.push(contact)
      }

      // Updated Contacts
      await MicrosoftContact.create(toUpdateRecords)
      await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')

      // New Contacts
      await Contact.create(newContacts, user, brand, 'microsoft_integration', { activity: false, relax: true, get: false })

      // Delete old removed remote attributes
      // if ( deletedAttributes.length ) {
      //   await ContactAttribute.delete(deletedAttributes, user)
      // }

      createdNum = createdMicrosoftContacts.length
    }

    return {
      status: true,
      createdNum
    }

  } catch (ex) {

    if ( fiveXErr.includes(Number(ex.statusCode)) || (ex.message === ECONNRESET) ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}

const syncAvatars = async (microsoft, credential, lastSyncAt) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateContacts = []

  // update microsoft_contacts set data = jsonb_set(data, '{photo}', '"zzzz"', false) where id = 'a469e77a-cbfd-41d7-8c4c-b3dc793e4a65';

  try {

    // all microsoft contacts with not synced avatar and not deleted
    const microsoftContacts = await MicrosoftContact.getAllBySource(credential.id, 'contacts')

    for (const mcontact of microsoftContacts) {

      const file = await extractPhoto(microsoft, user, brand, mcontact)
      const photo = file ? file.url : ''


      const result = await Contact.fastFilter(brand, [], { microsoft_id: mcontact.id })
      const relevantContactId = result.ids[0]

      const attributes = []
      attributes.push({ attribute_type: 'profile_image_url', text: photo })
      attributes.push({ attribute_type: 'cover_image_url', text: photo })

      toUpdateContacts.push({ id: relevantContactId, attributes })
    }


    // Updated Contacts
    await MicrosoftContact.updateNewColumn([])
    await Contact.update(toUpdateContacts, user, brand, 'microsoft_integration')


    return {
      status: true
    }

  } catch (ex) {

    if ( fiveXErr.includes(Number(ex.statusCode)) || (ex.message === ECONNRESET) ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }
      
    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  syncContacts
}