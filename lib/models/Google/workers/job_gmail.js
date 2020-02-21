const Context = require('../../Context')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const contactGroupWorker = require('./contacts/contact_group')
const contactWorker      = require('./contacts/contact')
const messageWorker      = require('./gmail/message')
const historyWorker      = require('./gmail/history')

const { getGoogleClient } = require('../plugin/client.js')
const GoogleCredential    = require('../credential')
const GoogleSyncHistory   = require('../sync_history')



const syncGoogle = async (data) => {
  const sync_start_time = new Date()

  let synced_messages_num = 0
  let messages_total      = 0
  let synced_contacts_num = 0
  let contacts_total      = 0
  let sync_duration       = 0

  const currentCredential = await GoogleCredential.get(data.googleCredential.id)
  const duplicateCheck    = new Date(currentCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Google Sync Job Is Skipped', emoji: ':skull:' })
    return
  }

  const google = await getGoogleClient(data.googleCredential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: 'Google Sync Job Is Skipped, Client Is Failed', emoji: ':skull:' })
    return
  }


  const addLastSyncRecord = async function(status) {
    return await GoogleSyncHistory.addSyncHistory({
      user: data.googleCredential.user,
      brand: data.googleCredential.brand,
      google_credential: data.googleCredential.id,
      synced_messages_num,
      messages_total,
      synced_contacts_num,
      contacts_total,
      sync_duration: new Date().getTime() - sync_start_time.getTime(),
      status
    })
  }

  const handleException = async function(msg, ex) {
    // invalid_grant => https://blog.timekit.io/google-oauth-invalid-grant-nightmare-and-how-to-fix-it-9f4efaf1da35
    // rate limit => https://developers.google.com/gmail/api/v1/reference/quota (ex.statusCode: 429)

    if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
      await GoogleCredential.disableEnableSync(data.googleCredential.id, 'disable')
    }

    const obj = {
      id: data.googleCredential.id,
      email: data.googleCredential.email,
      revoked: data.googleCredential.revoked,
      last_sync_at: data.googleCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':bell:'

    // Slack.send({ channel: '7-server-errors',  text, emoji })
    Slack.send({ channel: 'integration_logs', text, emoji })

    await GoogleCredential.postponeSync(data.googleCredential.id)
    await addLastSyncRecord(false)

    return
  }

  const messagesFullSync = async function(hasLostState = false) {
    const syncMessagesResult = await messageWorker.syncMessages(google, data, hasLostState)
    if ( !syncMessagesResult.status ) {
      await handleException('Job Error - Google Sync Failed [sync-messages]', syncMessagesResult.ex)
      return
    }
    Context.log('SyncGoogle - syncMessagesResult', data.googleCredential.id, data.googleCredential.email, syncMessagesResult)

    synced_messages_num = syncMessagesResult.createdNum
    messages_total      = syncMessagesResult.totalNum
  }

  Context.log('SyncGoogle - start job', data.googleCredential.id, data.googleCredential.email)


  // Sync Contacts
  if ( data.googleCredential.scope_summary.includes('contacts.read') ) {
    const contactGroupsResult = await contactGroupWorker.syncContactGroups(google, data)
    if ( !contactGroupsResult.status ) {
      await handleException('Job Error - Google Sync Failed [contact-groups]', contactGroupsResult.ex)
      return
    }
    Context.log('SyncGoogle - contactGroupsResult', data.googleCredential.id, data.googleCredential.email, contactGroupsResult)
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Google Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
    Context.log('SyncGoogle - contactsLastRsult', data.googleCredential.id, data.googleCredential.email, contactsLastRsult)

    synced_contacts_num = contactsLastRsult.createdNum
    contacts_total      = contactsLastRsult.totalNum
  }


  // Sync Messages
  if ( data.googleCredential.scope_summary.includes('mail.read') ) {
    if (data.googleCredential.messages_sync_history_id) {

      const partialSyncResult = await historyWorker.partialSync(google, data)

      if ( partialSyncResult.needsFullSync ) {

        Context.log('SyncGoogle - partialSyncResult Needs-FullSync', data.googleCredential.id, data.googleCredential.email)
        await messagesFullSync(true)

      } else {

        if ( !partialSyncResult.status ) {
          await handleException('Job Error - Google Sync Failed [partial-sync-messages]', partialSyncResult.ex)
          return
        }
        Context.log('SyncGoogle - partialSyncResult', data.googleCredential.id, data.googleCredential.email, partialSyncResult)
  
        synced_messages_num = partialSyncResult.createdNum
        messages_total      = partialSyncResult.totalNum
      }
      
    } else {
      
      await messagesFullSync()
    }

    // Handle MailBox Watcher
    const watchMailBoxResult = await messageWorker.watchMailBox(google, data)
    Context.log('SyncGoogle watchMailBox:', data.googleCredential.id, watchMailBoxResult)
  }


  sync_duration = new Date().getTime() - sync_start_time.getTime()

  // Update as Success
  await GoogleCredential.updateLastSync(data.googleCredential.id, sync_duration)
  await addLastSyncRecord(true)


  Socket.send('Google.Contacts.Imported', data.googleCredential.user, [synced_contacts_num])

  Context.log('SyncGoogle - job Finish', data.googleCredential.id, data.googleCredential.email, sync_duration)

  return
}


module.exports = {
  syncGoogle
}
