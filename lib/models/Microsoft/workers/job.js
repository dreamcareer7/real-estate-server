const { getMGraphClient } = require('../plugin/client.js')

const Context = require('../../Context')
const config  = require('../../../config')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const profileWorker       = require('./profile')
const contactWorker       = require('./contacts/contact')
const contactFolderWorker = require('./contacts/contact_folder')
const messageWorker       = require('./messages')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')



const syncMicrosoft = async (data) => {
  const sync_start_time = new Date()
  const Microsoft_Error = 'Microsoft-Error'

  let extract_contacts_error = ''
  let sync_messages_error    = ''

  let synced_messages_num    = 0
  let messages_total         = 0
  let synced_contacts_num    = 0
  let extracted_contacts_num = 0
  let contacts_total         = 0
  let sync_duration          = 0
  

  const currentMicrosoftCredential = await MicrosoftCredential.get(data.microsoftCredential.id)
  const microsoftJobDuplicateCheck = new Date(currentMicrosoftCredential.last_sync_at).getTime() !== new Date(data.microsoftCredential.last_sync_at).getTime()
  if (microsoftJobDuplicateCheck) {
    await MicrosoftCredential.updateSyncStatus(currentMicrosoftCredential.id, 'success')
    return
  }

  const addLastSyncRecord = async function(status) {
    return await MicrosoftSyncHistory.addSyncHistory({
      user: data.microsoftCredential.user,
      brand: data.microsoftCredential.brand,
      microsoft_credential: data.microsoftCredential.id,
  
      extract_contacts_error: extract_contacts_error,
      synced_contacts_num: synced_contacts_num + extracted_contacts_num,
      contacts_total: contacts_total,

      sync_messages_error: sync_messages_error,
      synced_messages_num: synced_messages_num,
      messages_total: messages_total,

      sync_duration: sync_duration,
  
      status: status
    })
  }

  const handleException = async function(msg, ex) {
    let invalidGrant = false

    if ( ex.message === 'invalid_grant' )
      invalidGrant = true

    if (ex.response) {
      if (ex.response.body) {
        const body = JSON.parse(ex.response.body)

        if ( body.error === 'invalid_grant' )
          invalidGrant = true
      }
    }

    if (invalidGrant)
      await MicrosoftCredential.disableEnableSync(data.microsoftCredential.id, 'disable')

    const obj = {
      id: data.microsoftCredential.id,
      email: data.microsoftCredential.email,
      revoked: data.microsoftCredential.revoked,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    Slack.send({ channel: '7-server-errors',  text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`, emoji: ':skull:' })

    const sync_finish_time = new Date() 
    sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

    await MicrosoftCredential.postponeSync(data.microsoftCredential.id)
    await addLastSyncRecord(false)

    return
  }

  const handleUnknownException = async function(msg, ex) {
    const obj = {
      id: data.microsoftCredential.id,
      email: data.microsoftCredential.email,
      revoked: data.microsoftCredential.revoked,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`, emoji: ':skull:' })

    await MicrosoftCredential.postponeSync(data.microsoftCredential.id)
    await addLastSyncRecord(false)

    return
  }

  const microsoft = await getMGraphClient(data.microsoftCredential)

  Context.log('SyncMicrosoft - start job', data.microsoftCredential.email, data.microsoftCredential.id)


  // Sync Profile
  if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.basic.includes(entry)) ) {
    const profileResult = await profileWorker.syncProfile(microsoft, data)
    if ( !profileResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [profile]', profileResult.ex)
      return
    }
    Context.log('SyncMicrosoft - profileResult', data.microsoftCredential.email, profileResult)
  }


  // Sync Contact-Folders and Contacts
  if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.contacts.read.includes(entry)) ) {
    const contactFoldersResult = await contactFolderWorker.syncContactFolders(microsoft, data)
    if ( !contactFoldersResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
      return
    }
    Context.log('SyncMicrosoft - contactFoldersResult', data.microsoftCredential.email, contactFoldersResult)


    const contactsLastRsult = await contactWorker.syncContacts(microsoft, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
    Context.log('SyncMicrosoft - contactsLastRsult', data.microsoftCredential.email, contactsLastRsult)

    synced_contacts_num = contactsLastRsult.createdNum
  }


  // Extract Contacts, Sync Messages
  if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.mail.read.includes(entry)) ) {

    if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.contacts.read.includes(entry)) ) {
      const syncContactsFromSentBoxResult = await messageWorker.extractContacts(microsoft, data)
      if ( !syncContactsFromSentBoxResult.status ) {

        if ( syncContactsFromSentBoxResult.ex_msg === Microsoft_Error ) {
          extract_contacts_error = Microsoft_Error
          await handleUnknownException('Job Error - Microsoft Sync Failed [extract-contacts-Unknown-Err]', syncContactsFromSentBoxResult.ex)
          return
        }

        await handleException('Job Error - Microsoft Sync Failed [extract-contacts]', syncContactsFromSentBoxResult.ex)
        return
      }
      Context.log('SyncMicrosoft - syncContactsFromSentBoxResult', data.microsoftCredential.email, syncContactsFromSentBoxResult)

      extracted_contacts_num = syncContactsFromSentBoxResult.createdNum
      contacts_total         = syncContactsFromSentBoxResult.totalNum
    }


    // Sync Messages
    const syncMessagesResult = await messageWorker.syncMessages(microsoft, data)

    if ( !syncMessagesResult.status ) {

      if ( syncMessagesResult.ex_msg === Microsoft_Error ) {
        sync_messages_error = Microsoft_Error
        await handleUnknownException('Job Error - Microsoft Sync Failed [sync-messages-Unknown-Err]', syncMessagesResult.ex)
        return
      }

      await handleException('Job Error - Microsoft Sync Failed [sync-messages]', syncMessagesResult.ex)
      return
    }
    Context.log('SyncMicrosoft - syncMessagesResult', data.microsoftCredential.email, syncMessagesResult)

    synced_messages_num = syncMessagesResult.createdNum
    messages_total      = syncMessagesResult.totalNum
  }


  const sync_finish_time = new Date() 
  sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

  // Update as Success
  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_finish_time, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])
  Context.log('SyncMicrosoft - job Finish', data.microsoftCredential.email, sync_duration)

  return
}


module.exports = {
  syncMicrosoft
}