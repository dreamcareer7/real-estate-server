const MicrosoftPlugin = require('../plugin/graph.js')

const Slack  = require('../../Slack')
const Socket = require('../../Socket')

const profileWorker       = require('./profile')
const contactWorker       = require('./contacts/contact')
const contactFolderWorker = require('./contacts/contact_folder')
const messageWorker       = require('./messages')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')



const setupClient = async (credential) => {
  const microsoft = await MicrosoftPlugin.setupClient(credential)

  try {
    const newTokens = await microsoft.refreshToken()
    await MicrosoftCredential.updateTokens(credential.id, newTokens)

    return {
      microsoft: microsoft,
      ex: null
    }

  } catch (ex) {

    return {
      microsoft: null,
      ex: ex
    }
  }
}

const syncMicrosoft = async (data) => {
  const sync_start_time = new Date()

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
  
      synced_messages_num: synced_messages_num,
      messages_total: messages_total,
      synced_contacts_num: synced_contacts_num + extracted_contacts_num,
      contacts_total: contacts_total,
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
      await MicrosoftCredential.updateAsRevoked(data.microsoftCredential.id)

    const obj = {
      id: data.microsoftCredential.id,
      user: data.microsoftCredential.user,
      brand: data.microsoftCredential.brand,
      remote_id: data.microsoftCredential.remote_id,
      email: data.microsoftCredential.email,
      scope: data.microsoftCredential.scope,
      revoked: data.microsoftCredential.revoked,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })

    const sync_finish_time = new Date() 
    sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

    await addLastSyncRecord(false)
  }

  const { microsoft, ex } = await setupClient(data.microsoftCredential)

  if ( !microsoft ||  ex ) {
    await handleException('Job Error - Microsoft client Failed', ex)
    return
  }

  console.log('\n\n Start microsoft-sync job', data.microsoftCredential.email, data.microsoftCredential.id, '\n')


  const profileResult = await profileWorker.syncProfile(microsoft, data)
  console.log('profileResult', profileResult)
  if ( !profileResult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [profile]', profileResult.ex)
    return
  }


  const contactFoldersResult = await contactFolderWorker.syncContactFolders(microsoft, data)
  console.log('contactFoldersResult', contactFoldersResult)
  if ( !contactFoldersResult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
    return
  }


  const contactsLastRsult = await contactWorker.syncContacts(microsoft, data)
  console.log('contactsLastRsult', contactsLastRsult)
  if ( !contactsLastRsult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
    return
  }


  const syncContactsFromSentBoxResult = await messageWorker.extractContacts(microsoft, data)
  console.log('syncContactsFromSentBoxResult', syncContactsFromSentBoxResult)
  if ( !syncContactsFromSentBoxResult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [sync-messages]', syncContactsFromSentBoxResult.ex)
    return
  }


  // const syncMessagesResult = await messageWorker.syncMessages(microsoft, data)
  // console.log('syncMessagesResult', syncMessagesResult)
  // if ( !syncMessagesResult.status ) {
  //   await handleException('Job Error - Microsoft Sync Failed [sync-messages]', syncMessagesResult.ex)
  //   return
  // }


  synced_contacts_num    = contactsLastRsult.createdNum
  extracted_contacts_num = syncContactsFromSentBoxResult.createdNum
  contacts_total         = syncContactsFromSentBoxResult.totalNum
  synced_messages_num    = 0 // syncMessagesResult.createdNum
  messages_total         = 0 // syncMessagesResult.totalNum


  const sync_finish_time = new Date() 
  sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_finish_time, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])
  console.log('\nsyncMicrosoft-job Finish', sync_duration)

  return
}


module.exports = {
  syncMicrosoft
}