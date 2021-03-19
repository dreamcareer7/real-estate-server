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

/**
 * Its responsible in case of Graph request failure.
 * @param {any[]} failedResponses
 * @param {string} [title] A suitable title for the recent operation
 * @returns {boolean} true: everything is OK, false: failure detected
 */
const handleRequestsFailure = async (failedResponses, title = 'Unknown') => {
  if (!Array.isArray(failedResponses) || !failedResponses.length) { return true }

  /* TODO: implement me */

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
  
  return false
}

async function handleCreated (microsoft, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateMContacts(credential.id, contacts)

  console.log('contacts', contacts, '\n')
  console.log('records', records, '\n')

  const result = await microsoft.batchInsertContacts(records)
  await handleRequestsFailure(result.failed, 'batchInsertContacts')

  const confirmedIds = result.confirmed.map(c => ({
    parentFolderId: c.body.parentFolderId,
    id: c.body.id,
  }))
  
  const getResult = await microsoft.batchGetContacts(confirmedIds, {
    withExtensions: true
  })
  handleRequestsFailure(getResult.failed, 'batchGetContacts')
  
  const refined = refineContacts(getResult.confirmed.map(c => c.body))

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
      remote_id: c.remote_id,
      contact,
      etag: c.etag,
      data: JSON.stringify(c),
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
    
    if (!mcontact || !mcontact.data) { return null }

    /* idk if `mcontact.data` already is a json object or not, so... */
    if (typeof mcontact.data === 'string') {
      mcontact.data = JSON.parse(mcontact.data)
    }
    
    return {
      ...record,
      id: mcontact.data.id,
      parentFolderId: mcontact.data.parentFolderId,
    }
  }).filter(c => c.id)

  const result = await microsoft.batchUpdateContacts(refined)
  await handleRequestsFailure(result.failed, 'batchUpdateContacts')
  
  const confirmed = refineContacts(result.confirmed.map(c => c.body))

  const toUpdateMContacts = confirmed.map(c => ({
    microsoft_credential: credential.id,
    remote_id: c.remote_id,
    etag: c.etag,
    data: JSON.stringify(c),
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

  /** @type {{ id: string, parentFolderId?: string? }[]} */
  const deletionArr = microsoftContacts.map(mc => {
    if (!mc || !mc.data) { return null }
    mc.data = typeof mc.data === 'object' ? mc.data : JSON.parse(mc.data)

    return {
      id: mc.remote_id,
      parentFolderId: mc.data.parentFolderId ?? null,
    }
  }).filter(Boolean)

  await MicrosoftContact.deleteMany(microsoftContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, 'microsoft_integration')

  const deleteResult = await microsoft.batchDeleteContacts(deletionArr)
  await handleRequestsFailure(deleteResult.failed, 'batchDeleteContacts')
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}
