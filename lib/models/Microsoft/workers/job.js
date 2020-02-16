const { getMGraphClient } = require('../plugin/client.js')

const Context = require('../../Context')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const contactWorker      = require('./contacts')
const messageWorker      = require('./messages')
const subscriptionWorker = require('./subscriptions')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')
const MicrosoftSubscription = require('../subscription')



const syncMicrosoft = async (data) => {
  const sync_start_time = new Date()
  const Microsoft_Error = 'Microsoft-Error'

  let extract_contacts_error = ''
  let sync_messages_error    = ''

  let synced_messages_num        = 0
  let messages_total             = 0
  let synced_contacts_num        = 0
  let extracted_contacts_num     = 0
  let contacts_total             = 0
  let sync_duration              = 0
  // let synced_calendar_events_num = 0
  // let calendar_events_total      = 0

  const currentMicrosoftCredential = await MicrosoftCredential.get(data.microsoftCredential.id)
  const microsoftJobDuplicateCheck = new Date(currentMicrosoftCredential.last_sync_at).getTime() !== new Date(data.microsoftCredential.last_sync_at).getTime()
  
  if ( microsoftJobDuplicateCheck || currentMicrosoftCredential.revoked || currentMicrosoftCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: 'Microsoft Sync Job Is Skipped', emoji: ':skull:' })
    return
  }

  const { microsoft } = await getMGraphClient(data.microsoftCredential)

  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: 'Microsoft Sync Job Is skipped, Client Is Failed', emoji: ':skull:' })
    return
  }


  const addLastSyncRecord = async function(status) {
    return await MicrosoftSyncHistory.addSyncHistory({
      user: data.microsoftCredential.user,
      brand: data.microsoftCredential.brand,
      microsoft_credential: data.microsoftCredential.id,
      extract_contacts_error,
      synced_contacts_num: synced_contacts_num + extracted_contacts_num,
      contacts_total,
      sync_messages_error,
      synced_messages_num,
      messages_total,
      // synced_calendar_events_num,
      // calendar_events_total,
      sync_duration: new Date().getTime() - sync_start_time.getTime(),
      status
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

    if (invalidGrant) {
      await MicrosoftSubscription.stop(data.microsoftCredential)
      await MicrosoftCredential.disableEnableSync(data.microsoftCredential.id, 'disable')
    }

    const obj = {
      id: data.microsoftCredential.id,
      email: data.microsoftCredential.email,
      revoked: data.microsoftCredential.revoked,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':bell:'

    // Slack.send({ channel: '7-server-errors',  text, emoji })
    Slack.send({ channel: 'integration_logs', text, emoji })

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

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    await MicrosoftCredential.postponeSync(data.microsoftCredential.id)
    await addLastSyncRecord(false)

    return
  }

  Context.log('SyncMicrosoft - start job', data.microsoftCredential.email, data.microsoftCredential.id)


  // Sync Contact-Folders and Contacts
  if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, data)
    if ( !contactFoldersResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
      return
    }
    Context.log('SyncMicrosoft - contactFoldersResult', data.microsoftCredential.email, contactFoldersResult)


    const contactsLastRsult = await contactWorker.contacts.syncContacts(microsoft, data)
    if ( !contactsLastRsult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }
    Context.log('SyncMicrosoft - contactsLastRsult', data.microsoftCredential.email, contactsLastRsult)

    synced_contacts_num = contactsLastRsult.createdNum
  }


  // Extract Contacts, Sync Messages
  if ( data.microsoftCredential.scope_summary.includes('mail.read') ) {

    if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
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


  // Outlook Subscription
  if ( data.microsoftCredential.scope_summary.includes('mail.read') ) {
    const outlookSubscriptionResult = await subscriptionWorker.messages.handleSubscriptions(microsoft, data)
    if ( !outlookSubscriptionResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [outlook-subscription]', outlookSubscriptionResult.ex)
      return
    }
    Context.log('SyncMicrosoft OutlookSub - outlookSubscriptionResult', data.microsoftCredential.email, outlookSubscriptionResult)
  }


  // Calendar
  /*
  if ( data.microsoftCredential.scope_summary.includes('calendar') ) {
    if (data.microsoftCredential.microsoft_calendar) {
      const calendarSubscriptionResult = await subscriptionWorker.calendars.handleSubscriptions(microsoft, data)
      if ( !calendarSubscriptionResult.status ) {
        await handleException('Job Error - Microsoft Sync Failed [calendars-subscription]', calendarSubscriptionResult.ex)
        return
      }
      Context.log('SyncMicrosoft OutlookSub - calendarSubscriptionResult', data.microsoftCredential.email, calendarSubscriptionResult)


      // synced_calendar_events_num = calendarEventsResult.confirmedNum
      // calendar_events_total      = calendarEventsResult.totalNum
    }
  }
  */

  sync_duration = new Date().getTime() - sync_start_time.getTime()

  // Update as Success
  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])
  Context.log('SyncMicrosoft - job Finish', data.microsoftCredential.email, sync_duration)

  return
}

const handleMessageNotif = async (data) => {
  try {
    const subscription = await MicrosoftSubscription.getByRemoteId(data.subscriptionId)
    const credential   = await MicrosoftCredential.get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      const text  = `SyncMicrosoft - Microsoft-Credential is not active! - subscription: ${subscription.id}`
      Slack.send({ channel: 'integration_logs', text, emoji: ':bell:' })

      return
    }

    if ( data.lifecycleEvent === 'subscriptionRemoved' ) {
      Context.log('SyncMicrosoft - OutlookSub LifecycleEvent(removed)', credential.email, credential.id)
      await MicrosoftSubscription.stop(credential)
      // await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

      return
    }

    if ( data.lifecycleEvent === 'missed' ) {
      Context.log('SyncMicrosoft - OutlookSub LifecycleEvent(missed)', credential.email, credential.id)
      return await MicrosoftCredential.forceSync(subscription.microsoft_credential)
    }


    // Outlook messages
    if ( subscription.resource === '/me/messages' ) {
  
      if ( data.changeType === 'deleted' ) {
        return await subscriptionWorker.messageEvents.handleDeleteEvent(credential, data.resourceData.id)
      }
  
      if ( data.changeType === 'updated' ) {
        return await subscriptionWorker.messageEvents.handleUpdateEvents(credential, data.resourceData.id)
      }
  
      if ( data.changeType === 'created' ) {
        const result = await subscriptionWorker.messageEvents.handleCreateEvents(credential, data.resourceData.id)
  
        if (result) {
          Context.log('SyncMicrosoft - OutlookSub - Force Sync', credential.email, credential.id)
          await MicrosoftCredential.forceSync(subscription.microsoft_credential)
        }
  
        return
      }
    }

    // Calendar events
    if ( subscription.resource === '/me/events' ) {
      return

      /*
      if ( data.changeType === 'deleted' ) {
        return
      }
  
      if ( data.changeType === 'updated' ) {
        return
      }
  
      if ( data.changeType === 'created' ) {
        return
      }
      */
    }

  } catch (ex) {

    if ( ex.message === 'Please wait until current sync job is finished.' ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookSub - Notifications process failed - subscription: ${data.subscriptionId} - Data: ${JSON.stringify(data)} - Ex: ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.subscriptionId} - Details: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })
    Slack.send({ channel: '7-server-errors',  text, emoji })

    return
  }
}


module.exports = {
  syncMicrosoft,
  handleMessageNotif
}
