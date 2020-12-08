const Context = require('../../../Context')

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

const syncAvatars = async (microsoft, credential) => {
  const brand = credential.brand
  const user  = credential.user

  const toUpdateMicContacts = []
  const toUpdateContacts    = []

  const helper = async (mcontact) => {
    const file  = await extractPhoto(microsoft, user, brand, mcontact)
    const photo = file ? file.url : null

    const microsoft_credential = mcontact.microsoft_credential
    const remote_id = mcontact.remote_id

    toUpdateMicContacts.push({ microsoft_credential, remote_id, photo, processed_photo: true })

    if (photo) {
      const result = await Contact.fastFilter(brand, [], { microsoft_id: mcontact.id })
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

    const microsoftContacts = await MicrosoftContact.filter({ microsoft_credential: credential.id, source: 'contacts', processed_photo: false })

    if ( microsoftContacts.length === 0 ) {
      return {
        status: true
      }
    }

    let promises = []

    for (const mcontact of microsoftContacts) {
      promises.push(helper(mcontact))

      if ( promises.length && (promises.length % 5 === 0) ) {
        await Promise.all(promises)
        promises = []

        Context.log('SyncMicrosoftContactsAvatars toUpdateMicContacts.length', toUpdateMicContacts.length)
        Context.log('SyncMicrosoftContactsAvatars toUpdateContacts.length', toUpdateContacts.length)
      }
    }

    if (promises.length) {
      await Promise.all(promises)
      promises = []

      Context.log('SyncMicrosoftContactsAvatars toUpdateMicContacts.length', toUpdateMicContacts.length)
      Context.log('SyncMicrosoftContactsAvatars toUpdateContacts.length', toUpdateContacts.length)
    }

    // Updated Contacts
    await MicrosoftContact.bulkUpdate(toUpdateMicContacts)
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
  syncContacts,
  syncAvatars
}