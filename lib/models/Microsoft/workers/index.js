const MicrosoftPlugin = require('../plugin/graph.js')

const Slack  = require('../../Slack')
const Socket = require('../../Socket')

const profileWorker       = require('./profile')
const contactWorker       = require('./contacts/contact')
const contactFolderWorker = require('./contacts/contact_folder')
// const messageWorker = require('./messages')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')



const setupClient = async (credential) => {
  const microsoft = await MicrosoftPlugin.setupClient(credential)
  const newTokens = await microsoft.refreshToken()

  await MicrosoftCredential.updateTokens(credential.id, newTokens)

  return microsoft
}

const syncMicrosoft = async (data) => {
  const sync_start_time = new Date()

  const synced_messages_num = 0
  const messages_total      = 0

  let synced_contacts_num = 0
  let contacts_total      = 0
  let sync_duration       = 0

  const currentMicrosoftCredential = await MicrosoftCredential.get(data.microsoftCredential.id)
  const microsoftJobDuplicateCheck = new Date(currentMicrosoftCredential.last_sync_at).getTime() !== new Date(data.microsoftCredential.last_sync_at).getTime()
  if (microsoftJobDuplicateCheck) {
    await MicrosoftCredential.updateSyncStatus(currentMicrosoftCredential.id, 'success')
    return
  }

  const microsoft = await setupClient(data.microsoftCredential)

  const addLastSyncRecord = async function(status) {
    return await MicrosoftSyncHistory.addSyncHistory({
      user: data.microsoftCredential.user,
      brand: data.microsoftCredential.brand,
      microsoft_credential: data.microsoftCredential.id,
  
      synced_messages_num: synced_messages_num,
      messages_total: messages_total,
      synced_contacts_num: synced_contacts_num,
      contacts_total: contacts_total,
      sync_duration: sync_duration,
  
      status: status
    })
  }

  const handleException = async function(msg, ex) {
    console.log('handleException', msg, ex.message, ex)

    if ( ex.message === 'invalid_grant' )
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

  console.log('\n\n Start microsoft-sync job', data.microsoftCredential.email, data.microsoftCredential.id, '\n')


  const profileResult = await profileWorker.syncProfile(microsoft, data)
  if ( !profileResult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [profile]', profileResult.ex)
    return
  }

  const contactFoldersResult = await contactFolderWorker.syncContactFolders(microsoft, data)
  if ( !contactFoldersResult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
    return
  }

  const contactsLastRsult = await contactWorker.syncContacts(microsoft, data)
  console.log('\n\ncontactsLastRsult', contactsLastRsult)
  if ( !contactsLastRsult.status ) {
    await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
    return
  }

  // synced_contacts_num = contactsLastRsult.createdNum
  // contacts_total      = contactsLastRsult.totalNum
  
  // const syncMessagesResult = await messageWorker.syncMessages(microsoft, data)
  // if ( !syncMessagesResult.status ) {
  //   await handleException('Job Error - Microsoft Sync Failed [sync-messages]', syncMessagesResult.ex)
  //   return
  // }

  // synced_messages_num = syncMessagesResult.createdNum
  // messages_total      = syncMessagesResult.totalNum

  // Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [contactsLastRsult.contactsNum])


  const sync_finish_time = new Date() 
  sync_duration = sync_finish_time.getTime() - sync_start_time.getTime()

  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_finish_time, sync_duration)
  await addLastSyncRecord(true)

  console.log('\nsyncMicrosoft-job Finish', sync_duration)
  return
}


module.exports = {
  syncMicrosoft
}