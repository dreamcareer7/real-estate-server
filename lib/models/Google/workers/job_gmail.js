const Context = require('../../Context')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const contactGroupWorker = require('./contacts/contact_group')
const contactWorker      = require('./contacts/contact')
const messageWorker      = require('./gmail/message')
const historyWorker      = require('./gmail/history')
const labelWorker        = require('./gmail/label')

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

  let dailySync = false

  const currentCredential = await GoogleCredential.get(data.googleCredential.id)
  const duplicateCheck    = new Date(currentCredential.last_sync_at).getTime() !== new Date(data.googleCredential.last_sync_at).getTime()

  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Google Sync Job Is Skipped', emoji: ':skull:' })
    return
  }

  const google = await getGoogleClient(data.googleCredential)

  if (!google) {
    Slack.send({ channel: 'integration_logs', text: `Google Sync Job Is Skipped, Client Is Failed - ${data.googleCredential.id} - ${data.googleCredential.email}`, emoji: ':skull:' })
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
      await GoogleCredential.disableSync(data.googleCredential.id)
    }

    const obj = {
      id: data.googleCredential.id,
      email: data.googleCredential.email,
      last_sync_at: data.googleCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':bell:'

    // Slack.send({ channel: '7-server-errors',  text, emoji })
    Slack.send({ channel: 'integration_logs', text, emoji })

    await GoogleCredential.postponeGmailSync(data.googleCredential.id)
    await addLastSyncRecord(false)

    return
  }

  const messagesFullSync = async function(hasLostState = false) {
    const syncMessagesResult = await messageWorker.syncMessages(google, data, hasLostState)
    if ( !syncMessagesResult.status ) {
      await handleException('Job Error - Google Sync Failed [sync-messages]', syncMessagesResult.ex)
      return
    }
    Context.log('SyncGoogle - syncMessagesResult', data.googleCredential.id, data.googleCredential.email)

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
    Context.log('SyncGoogle - contactGroupsResult', data.googleCredential.id, data.googleCredential.email)
  
    const contactsLastRsult = await contactWorker.syncContacts(google, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Google Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
    Context.log('SyncGoogle - contactsLastRsult', data.googleCredential.id, data.googleCredential.email)

    synced_contacts_num = contactsLastRsult.createdNum
    contacts_total      = contactsLastRsult.totalNum
  }


  // Sync Labels
  if ( data.googleCredential.scope_summary.includes('mail.read') ) {
    Context.log('SyncGoogle - syncLabels', data.googleCredential.id, data.googleCredential.email)

    const syncLabelsResult = await labelWorker.syncLabels(google, data)
    if ( !syncLabelsResult.status ) {
      await handleException('Job Error - Google Sync Failed [labels]', syncLabelsResult.ex)
      return
    }

    Context.log('SyncGoogle - syncLabels done', data.googleCredential.id, data.googleCredential.email)
  }


  // Sync Messages
  if ( data.googleCredential.scope_summary.includes('mail.read') ) {

    const lastDailySync = data.googleCredential.last_daily_sync ? new Date(data.googleCredential.last_daily_sync) : new Date()
    const dailySyncGap  = new Date().getTime() - lastDailySync.getTime()
    
    dailySync = dailySyncGap > (24 * 60 * 60 * 1000)

    if (dailySync) {
      Context.log('SyncGoogle - dailySync', data.googleCredential.id, data.googleCredential.email)
      await messagesFullSync(true)

    } else {

      if (data.googleCredential.messages_sync_history_id) {
  
        Context.log('SyncGoogle - partialSync', data.googleCredential.id, data.googleCredential.email)
        const partialSyncResult = await historyWorker.partialSync(google, data)
  
        if ( partialSyncResult.needsFullSync ) {
  
          Context.log('SyncGoogle - partialSyncResult Needs-FullSync', data.googleCredential.id, data.googleCredential.email)
          await messagesFullSync(true)
  
        } else {
  
          if ( !partialSyncResult.status ) {
            await handleException('Job Error - Google Sync Failed [partial-sync-messages]', partialSyncResult.ex)
            return
          }
          Context.log('SyncGoogle - partialSyncResult', data.googleCredential.id, data.googleCredential.email)
    
          synced_messages_num = partialSyncResult.createdNum
          messages_total      = partialSyncResult.totalNum
        }
  
      } else {
  
        Context.log('SyncGoogle - fullSync', data.googleCredential.id, data.googleCredential.email)
        await messagesFullSync()
      }
    }

    // Handle MailBox Watcher
    await messageWorker.watchMailBox(google, data)
    Context.log('SyncGoogle watchMailBox:', data.googleCredential.id)
  }


  sync_duration = new Date().getTime() - sync_start_time.getTime()

  // Update as Success
  await GoogleCredential.updateLastSync(data.googleCredential.id, sync_duration)

  if (dailySync) {
    await GoogleCredential.updateLastDailySync(data.googleCredential.id)
  }

  await addLastSyncRecord(true)


  Socket.send('Google.Contacts.Imported', data.googleCredential.user, [synced_contacts_num])

  Context.log('SyncGoogle - job Finish', data.googleCredential.id, data.googleCredential.email, sync_duration)

  return
}

const gmailWebhook = async (data) => {
  Context.log('SyncGoogle-debouncer gmailWebhook-jobHandler', data)

  const result      = await GoogleCredential.getByEmail(data.email)
  const credentials = result.filter(c => (c.scope_summary && c.scope_summary.includes('mail.read') && !c.revoked && !c.deleted_at))

  Context.log('SyncGoogle-debouncer gmailWebhook-jobHandler result.length', result.length)

  for (const credential of credentials) {
    try {
      Context.log('SyncGoogle-debouncer gmailWebhook-jobHandler forceSync', credential.id, credential.email)
      await GoogleCredential.forceSync(credential.id)
    } catch (ex) {
      Context.log('SyncGoogle-debouncer gmailWebhook-jobHandler forceSync-ex', credential.id, credential.email, ex.message)
      // do nothing
    }
  }

  return
}

module.exports = {
  syncGoogle,
  gmailWebhook
}
