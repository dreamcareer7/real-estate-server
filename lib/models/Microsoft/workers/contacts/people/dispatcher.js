const { keyBy } = require('lodash')

const MicrosoftContact   = require('../../../contact')
const ContactIntegration = require('../../../../ContactIntegration')

const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate')
}

const { retrieveContacts }   = require('./helpers/contacts')
const { generateMContacts }  = require('./helpers/attributes')
const { refineContacts }  = require('./helpers/refine')

async function handleCreated (microsoft, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateMContacts(credential.id, contacts)

  console.log('contacts', contacts, '\n')
  console.log('records', records, '\n')

  const result = await microsoft.batchInsertContacts(records)

  if (result.failed.length > 0) {
    // const code  = 'ErrorPropertyValidationFailure'
    // const codes = [...new Set(failed.filter(record => record?.body?.error?.code).map(record => record?.body?.error?.code))]
    // const text  = `SyncMicrosoftCalendar Batch Insert Failed - ${credential.id} - codes: ${JSON.stringify(codes)}`

    /*
      Sample failed response:
      failed = [{
        "id": "1",
        "status": 400,
        "headers": {
          "Cache-Control": "private",
          "Content-Type": "application/json"
        },
        "body": {
          "error": {
            "code": "ErrorPropertyValidationFailure",
            "message": "At least one property failed validation.",
            "innerError": {
              "date": "2021-01-21T13:13:46",
              "request-id": "05284592-30d2-41cc-a086-0f3453d9906f",
              "client-request-id": "05284592-30d2-41cc-a086-0f3453d9906f"
            }
          }
        }
      }]
    */

    // Context.log(text, failed.length, JSON.stringify(failed))

    // if (codes.includes(code)) {
    //   Context.log(text, events.length, JSON.stringify(events))
    // }

    // Slack.send({ channel, text, emoji: ':skull:' })
  }

  const confirmedIds = result.confirmed.map(c => ({
    parentFolderId: c.body.parentFolderId,
    id: c.body.id,
  }))
  const confirmed = await microsoft.batchGetContacts(confirmedIds)

  const refined = refineContacts(confirmed.map(c => c.body))

  const newMContacts  = refined.map(c => {
    const key     = `rechatCredential:${credential.id}`
    const sign    = c.clientData?.find?.(record => record.key === key)
    const contact = sign?.value?.split?.(':')?.[1]

    if (!contact) {
      /* This MUST be an impossible state, because we've created the contact
       * right now. TODO: Log sth to stdout, maybe rollback the db, ... */
      return null
    }
    
    return {
      microsoft_credential: credential.id,
      entry_id: c.entry_id,
      resource_id: c.resource_id,
      contact,
      etag: c.etag,
      resource: JSON.stringify(c),
      parked: false
    }
  }).filter(Boolean)

  const createdMContacts   = await MicrosoftContact.create(newMContacts)
  const integrationRecords = createdMContacts.map(mcontact => ({
    google_id: null,
    microsoft_id: mcontact.id,
    contact: mcontact.contact,
    origin: 'rechat',
    etag: mcontact.etag,
    local_etag: mcontact.etag
  }))

  return await ContactIntegration.insert(integrationRecords)
}

async function handleUpdated (microsoft, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const microsoftContacts  = await MicrosoftContact.getByRechatContacts(credential.id, contactIds)
  const mContactsByContact = keyBy(microsoftContacts, 'contact')

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateMContacts(credential.id, contacts)
  const refined  = records.map(record => {
    const mcontact = mContactsByContact[record.contact]

    return {
      ...record,
      resourceId: mcontact.resource_id,
      resource: { ...record.resource, etag: mcontact.etag },
    }
  })

  const result    = await microsoft.batchUpdateContacts(refined)
  const confirmed = refineContacts(result.confirmed.map(c => c.body))

  const toUpdateMContacts = confirmed.map(c => ({
    microsoft_credential: credential.id,
    entry_id: c.entry_id,
    resource_id: c.resource_id,
    etag: c.etag,
    resource: JSON.stringify(c),
    parked: false
  }))

  const updatedMContacts   = await MicrosoftContact.update(toUpdateMContacts)
  const toUpdateIntRecords = updatedMContacts.map(umc => ({
    google_id: null,
    microsoft_id: umc.id,
    contact: umc.contact,
    etag: umc.etag,
    local_etag: umc.etag
  }))

  return await ContactIntegration.mupsert(toUpdateIntRecords)
}

async function handleDeleted (microsoft, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const microsoftContacts    = await MicrosoftContact.getByRechatContacts(credential.id, contactIds)
  const microsoftContactIds  = microsoftContacts.map(mc => mc.id)
  const integrationRecords   = await ContactIntegration.getByMicrosoftIds(microsoftContactIds)
  const integrationRecordIds = integrationRecords.map(c => c.id)

  const deletionArr = microsoftContacts.map(record => record.resource_id)

  await MicrosoftContact.deleteMany(microsoftContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, 'microsoft_integration')
  await microsoft.batchDeleteContacts(deletionArr)
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}
