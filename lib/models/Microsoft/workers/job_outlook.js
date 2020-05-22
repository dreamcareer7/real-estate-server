const { getMGraphClient } = require('../plugin/client.js')

const Context = require('../../Context')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const contactWorker   = require('./contacts')
const messageWorker   = require('./messages')
const messagesWorkers = require('./subscriptions/messages')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')
const MicrosoftSubscription = require('../subscription')



const syncMicrosoft = async (data) => {
  const sync_start_time = new Date()

  let synced_messages_num    = 0
  let messages_total         = 0
  let synced_contacts_num    = 0
  let extracted_contacts_num = 0
  let contacts_total         = 0
  let sync_duration          = 0

  const currentCredential = await MicrosoftCredential.get(data.microsoftCredential.id)
  const duplicateCheck    = new Date(currentCredential.last_sync_at).getTime() !== new Date(data.microsoftCredential.last_sync_at).getTime()
  
  if ( duplicateCheck || currentCredential.revoked || currentCredential.deleted_at ) {
    // Slack.send({ channel: 'integration_logs', text: `Microsoft Sync Job Is Skipped - ${data.microsoftCredential.id} - ${data.microsoftCredential.email}`, emoji: ':bell:' })
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
      synced_contacts_num: synced_contacts_num + extracted_contacts_num,
      contacts_total,
      synced_messages_num,
      messages_total,
      sync_duration: new Date().getTime() - sync_start_time.getTime(),
      status
    })
  }

  const disableSync = async function(cid) {
    await MicrosoftCredential.disableSync(cid)
  }

  const postponeOutlookSync = async function(cid) {
    await MicrosoftCredential.postponeOutlookSync(cid)
  }

  const handleException = async function(msg, ex) {
    let invalidGrant = false

    if ( ex.message === 'invalid_grant' ) {
      invalidGrant = true
    }

    if (ex.response) {
      if (ex.response.body) {
        const body = JSON.parse(ex.response.body)

        if ( body.error === 'invalid_grant' ) {
          invalidGrant = true
        }
      }
    }

    const obj = {
      id: data.microsoftCredential.id,
      email: data.microsoftCredential.email,
      last_sync_at: data.microsoftCredential.last_sync_at
    }

    const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`
    const emoji = ':bell:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    if (invalidGrant) {
      await disableSync(data.microsoftCredential.id)
    } else {
      await postponeOutlookSync(data.microsoftCredential.id)
    }
    
    await addLastSyncRecord(false)

    return
  }

  Context.log('SyncMicrosoft - start job', data.microsoftCredential.email, data.microsoftCredential.id)


  // Sync Contact-Folders and Contacts
  if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
    const contactFoldersResult = await contactWorker.folders.syncContactFolders(microsoft, data)

    if ( !contactFoldersResult.status && !contactFoldersResult.skip ) {
      await handleException('Job Error - Microsoft Sync Failed [contact-folders]', contactFoldersResult.ex)
      return
    }

    Context.log('SyncMicrosoft - contactFoldersResult', data.microsoftCredential.email)


    const contactsLastRsult = await contactWorker.contacts.syncContacts(microsoft, data)

    if ( !contactsLastRsult.status && !contactsLastRsult.skip ) {
      await handleException('Job Error - Microsoft Sync Failed [contacts]', contactsLastRsult.ex)
      return
    }

    Context.log('SyncMicrosoft - contactsLastRsult', data.microsoftCredential.email)

    synced_contacts_num = contactsLastRsult.createdNum || 0
  }


  // Sync Folders
  await messageWorker.syncFolders(microsoft, data)


  // Extract Contacts, Sync Messages
  if ( data.microsoftCredential.scope_summary.includes('mail.read') ) {

    if ( data.microsoftCredential.scope_summary.includes('contacts.read') ) {
      const syncContactsFromSentBoxResult = await messageWorker.extractContacts(microsoft, data)

      if ( !syncContactsFromSentBoxResult.status && !syncContactsFromSentBoxResult.skip ) {
        await handleException('Job Error - Microsoft Sync Failed [extract-contacts]', syncContactsFromSentBoxResult.ex)
        return
      }

      Context.log('SyncMicrosoft - syncContactsFromSentBoxResult', data.microsoftCredential.email)

      extracted_contacts_num = syncContactsFromSentBoxResult.createdNum || 0
      contacts_total         = syncContactsFromSentBoxResult.totalNum || 0
    }


    // Sync Messages
    const syncMessagesResult = await messageWorker.syncMessages(microsoft, data)

    if ( !syncMessagesResult.status && !syncMessagesResult.skip ) {
      await handleException('Job Error - Microsoft Sync Failed [sync-messages]', syncMessagesResult.ex)
      return
    }

    Context.log('SyncMicrosoft - syncMessagesResult', data.microsoftCredential.email)

    synced_messages_num = syncMessagesResult.createdNum || 0
    messages_total      = syncMessagesResult.totalNum || 0
  }


  // Outlook Subscription
  if ( data.microsoftCredential.scope_summary.includes('mail.read') ) {
    const outlookSubscriptionResult = await messagesWorkers.messages.handleSubscriptions(microsoft, data)

    if ( !outlookSubscriptionResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [outlook-subscription]', outlookSubscriptionResult.ex)
      return
    }

    Context.log('SyncMicrosoft OutlookSub - outlookSubscriptionResult', data.microsoftCredential.email)
  }


  sync_duration = new Date().getTime() - sync_start_time.getTime()

  // Update as Success
  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])
  Context.log('SyncMicrosoft - job Finish', data.microsoftCredential.email, sync_duration)

  return
}

const handleNotifications = async (data) => {
  try {
    const subscription = await MicrosoftSubscription.getByRemoteId(data.subscriptionId)

    if (!subscription) {
      return
    }

    const credential = await MicrosoftCredential.get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.lifecycleEvent === 'subscriptionRemoved' ) {
      // Context.log('SyncMicrosoft - OutlookSub LifecycleEvent(removed)', credential.email, credential.id)
      return await MicrosoftSubscription.delete(subscription.id)
    }

    if ( data.lifecycleEvent === 'missed' ) {
      // Context.log('SyncMicrosoft - OutlookSub LifecycleEvent(missed)', credential.email, credential.id)
      return await MicrosoftCredential.forceSync(subscription.microsoft_credential)
    }

    if ( subscription.resource === '/me/messages' ) {
  
      if ( data.changeType === 'deleted' ) {
        return await messagesWorkers.events.handleDeleteEvent(credential, data.resourceData.id)
      }
  
      if ( data.changeType === 'updated' ) {
        return await messagesWorkers.events.handleUpdateEvents(credential, data.resourceData.id)
      }
  
      if ( data.changeType === 'created' ) {
        const result = await messagesWorkers.events.handleCreateEvents(credential, data.resourceData.id)
  
        if (result) {
          Context.log('SyncMicrosoft - OutlookSub - Force Sync', credential.email, credential.id)
          await MicrosoftCredential.forceSync(subscription.microsoft_credential)
        }
  
        return
      }
    }

  } catch (ex) {

    if ( ex.message === 'Please wait until current sync job is finished.' ) {
      return
    }

    // nothing to do
    if ( ex.statusCode === 429 ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookSub - Notifications process failed - subscription: ${data.subscriptionId} - Ex: ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.subscriptionId} - Details: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  syncMicrosoft,
  handleNotifications
}
