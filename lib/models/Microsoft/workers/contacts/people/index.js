const { groupBy, keyBy } = require('lodash')

const config = require('../../../../../config')

const ContactIntegration  = require('../../../../ContactIntegration')
const MicrosoftContact    = require('../../../contact')
const ContactAttribute    = {
  ...require('../../../../Contact/attribute/manipulate'),
  ...require('../../../../Contact/attribute/get'),
}

const MicrosoftCredential = {
  ...require('../../../credential/update')
}

const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate')
}

const { parseAttributes, findNewAttributes } = require('./helpers/attributes')
const { targetKeys, projection, fiveXErr, ECONNRESET } = require('../static')

const _REASON = config.microsoft_integration.contact_update_reason



const handleNewRecords = async (microsoftContacts) => {
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


  // This is a temporary hack to handle already synced outlook_contacts that do not have any relevant contact_integration record.
  // We can delete this part later
  const microsoftIds       = integrationRecords.map(r => r.microsoft_id)
  const alreadyCreated     = await ContactIntegration.getByMicrosoftIds(microsoftIds)
  const alreadyCreatedMIds = alreadyCreated.map(r => r.microsoft_id)
  const toCreateRecords    = integrationRecords.filter(r => !alreadyCreatedMIds.includes(r.microsoft_id))
  await ContactIntegration.insert(toCreateRecords)
}

const microsoftToRechat = async (microsoft, credential) => {
  const credentialId = credential.id
  const brand        = credential.brand
  const user         = credential.user

  try {
    const contactFolders = await MicrosoftContact.getRefinedContactFolders(credentialId)
    const folders        = await MicrosoftContact.getCredentialFolders(credentialId)

    folders.push({ id: null, folder_id: null, sync_token: credential.contacts_sync_token })

    const { contacts, syncTokens } = await microsoft.syncContacts(folders, projection)

    const remoteIdsArr          = contacts.map(c => c.id)
    const oldMicrosoftContacts  = await MicrosoftContact.getAllBySource(credentialId, remoteIdsArr, 'contacts')

    const oldMContactRemoteIds  = oldMicrosoftContacts.map(c => c.remote_id)
    const oldMContactByRemoteId = keyBy(oldMicrosoftContacts, 'remote_id')

    const newRemoteContacts   = contacts.filter(c => !oldMContactRemoteIds.includes(c.id))
    const oldRemoteContacts   = contacts.filter(c => oldMContactRemoteIds.includes(c.id) && oldMContactByRemoteId[c.id])

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
    const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact })

    const toUpdateContacts = []

    /** @type {UUID[]} */
    const toDeleteAttributeIds = []

    for (const mcontact of updatedMicrosoftContacts) {
      const id      = mcontact.contact
      const data    = mcontact.data
      const oldData = oldMContactByRemoteId[mcontact.remote_id].data
      const { attributes, deletedAtt } = findNewAttributes(data, oldData, refinedAtts[id])

      if (attributes.length) {
        toUpdateContacts.push({ id, attributes })
      }

      toDeleteAttributeIds.push(...deletedAtt ?? [])
    }

    await ContactAttribute.delete(toDeleteAttributeIds, user, _REASON)
    await Contact.update(toUpdateContacts, user, brand, _REASON)

    await handleNewRecords(createdMicrosoftContacts)
    await handleToUpdateRecords(updatedMicrosoftContacts)


    const folderRecords = syncTokens
      .filter(r => r.folder_id)
      .map(r => ({ microsoft_credential: credentialId, folder_id: r.folder_id, sync_token: r.delta }))

    const delta = syncTokens
      .filter(r => !r.folder_id)
      .map(r => r.delta).pop()

    await MicrosoftContact.bulkUpdateFolderSyncTokens(folderRecords)
    await MicrosoftCredential.updateContactsSyncToken(credentialId, delta)

    return {
      status: true,
      upsertedNum: createdMicrosoftContacts.length + updatedMicrosoftContacts.length
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

const rechatToMicrosoft = async (microsoft, credential, lastSyncAt) => {
}


module.exports = {
  microsoftToRechat,
  rechatToMicrosoft
}