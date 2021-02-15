const config = require('../../../../config')
const Context = require('../../../Context')

const { groupBy, keyBy } = require('lodash')

const ContactIntegration = require('../../../ContactIntegration')
const MicrosoftContact   = require('../../contact')
const ContactAttribute   = require('../../../Contact/attribute/get')
const Contact = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate')
}

const { parseAttributes, findNewAttributes } = require('./helper')
const { targetKeys, projection, fiveXErr, ECONNRESET } = require('./static')

const _REASON = config.microsoft_integration.contact_update_reason



const handleNewRecords = async (microsoftContacts) => {
  Context.log('handleNewRecords', JSON.stringify(microsoftContacts))

  const integrationRecords = microsoftContacts.map(mc => (
    {
      microsoft_id: mc.id,
      google_id: null,
      contact: mc.contact,
      origin: 'microsoft',
      etag: mc.etag,
      local_etag: mc.etag      
    }
  ))

  await ContactIntegration.insert(integrationRecords)
}

const handleToUpdateRecords = async (microsoftContacts) => {
  Context.log('handleToUpdateRecords', JSON.stringify(microsoftContacts))

  const integrationRecords = microsoftContacts.map(mc => (
    {
      microsoft_id: mc.id,
      google_id: null,
      contact: mc.contact,
      origin: 'microsoft',
      etag: mc.etag,
      local_etag: mc.etag      
    }
  ))

  await ContactIntegration.mupsert(integrationRecords)
}

const syncContacts = async (microsoft, credential, lastSyncAt) => {
  const credentialId = credential.id
  const brand        = credential.brand
  const user         = credential.user

  let upsertedNum = 0
  let deletedAttributes = []

  try {
    const contactFolders = await MicrosoftContact.getRefinedContactFolders(credentialId)
    const folders        = await MicrosoftContact.getCredentialFolders(credentialId)
    const contacts       = await microsoft.getContactsNative(lastSyncAt, folders, projection)

    if (contacts.length === 0) {
      return {
        status: true,
        upsertedNum
      }
    }


    const remoteIdsArr          = contacts.map(c => c.id)
    const oldMicrosoftContacts  = await MicrosoftContact.getAllBySource(credentialId, remoteIdsArr, 'contacts')
    const oldMContactRemoteIds  = oldMicrosoftContacts.map(c => c.remote_id)
    const oldMContactByRemoteId = keyBy(oldMicrosoftContacts, 'remote_id')

    const newRemoteContacts   = contacts.filter(c => !oldMContactRemoteIds.includes(c.id))
    const oldRemoteContacts   = contacts.filter(c => oldMContactRemoteIds.includes(c.id) && (oldMContactByRemoteId[c.remote_id].etag !== c.etag))

    const newRemoteContactIds = newRemoteContacts.map(c => c.id) // <== remote_id

    /*
      For the sake of simplicity we dont check if any contact has been deleted on Rechat or not.
      We skip this condition in the next filter clause: !oldMContactByRemoteId[c.id].deleted_at

      With this setup, any incomming update for deleted contacts will be accepted, but user won't notify
      It will introduce more complexity if we check and exclude deleted contacts, updating a deleted contact is a safe operation.
    */
    const toUpdateContactIds  = oldRemoteContacts.filter(c => oldMContactByRemoteId[c.id]?.contact).map(c => oldMContactByRemoteId[c.id].contact)
    const toUpdateMContacts   = oldRemoteContacts.map(c => (
      {
        microsoft_credential: credentialId,
        remote_id: c.id,
        data: JSON.stringify(c),
        etag: c['@odata.etag'] || null,
        parked: false
      }
    ))

    const newContacts = newRemoteContacts.map(contact => {
      /** @type {IContactInput} */
      const contactObj = {
        user,
        attributes: [{ attribute_type: 'source_type', text: 'Microsoft' }],
        parked: false
      }

      for (const key in contact) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes      = parseAttributes(key, contact, contactFolders)
          contactObj.attributes = contactObj.attributes.concat(attributes)
        }
      }

      return contactObj
    })

    const createdContactIds = await Contact.create(newContacts, user, brand, _REASON, { activity: false, relax: true, get: false })

    const newMContacts = newRemoteContacts.map(contact => {
      const index = newRemoteContactIds.indexOf(contact.id)

      Context.log('newMContacts index', index)
      Context.log('newMContacts contact', JSON.stringify(contact))

      return {
        microsoft_credential: credentialId,
        remote_id: contact.id,
        contact: createdContactIds[index],
        data: JSON.stringify(contact),
        etag: contact['@odata.etag'] || null,
        parked: false
      }
    })

    const createdMicrosoftContacts = await MicrosoftContact.create(newMContacts)
    const updatedMicrosoftContacts = await MicrosoftContact.update(toUpdateMContacts)

    const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)        
    const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact})

    const toUpdateContacts = []

    for (const mcontact of updatedMicrosoftContacts) {
      const id      = mcontact.contact
      const data    = mcontact.data
      const oldData = oldMContactByRemoteId[mcontact.remote_id].data
      const { attributes, deletedAtt } = findNewAttributes(data, oldData, refinedAtts[id])

      deletedAttributes = deletedAttributes.concat(deletedAtt)

      if (attributes.length) {
        toUpdateContacts.push({ id, attributes })
      }
    }

    await Contact.update(toUpdateContacts, user, brand, _REASON)

    await handleNewRecords(createdMicrosoftContacts)
    await handleToUpdateRecords(updatedMicrosoftContacts)


    // Delete old removed remote attributes
    // if ( deletedAttributes.length ) {
    //   await ContactAttribute.delete(deletedAttributes, user)
    // }

    upsertedNum = createdMicrosoftContacts.length + updatedMicrosoftContacts.length

    return {
      status: true,
      upsertedNum
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