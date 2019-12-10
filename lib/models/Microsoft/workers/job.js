const { getMGraphClient } = require('../plugin/client.js')

const Context = require('../../Context')
const config  = require('../../../config')
const Slack   = require('../../Slack')
const Socket  = require('../../Socket')

const profileWorker      = require('./profile')
const contactWorker      = require('./contacts')
const messageWorker      = require('./messages')
const subscriptionWorker = require('./subscriptions')

const MicrosoftCredential   = require('../credential')
const MicrosoftSyncHistory  = require('../sync_history')
const MicrosoftSubscription = require('../subscription')

const SUBSCRIPTION_SECRET = config.microsoft_integration.subscription_secret
const Microsoft_Graph_Message = '#Microsoft.Graph.Message'


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
  
  if ( microsoftJobDuplicateCheck || currentMicrosoftCredential.revoked || currentMicrosoftCredential.deleted_at ) {
    Slack.send({ channel: 'integration_logs', text: `Microsoft - Revoked: ${currentMicrosoftCredential.revoked} - Deleted_At: ${currentMicrosoftCredential.deleted_at} - Action: Job skipped`, emoji: ':skull:' })
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

    sync_duration = new Date().getTime() - sync_start_time.getTime()

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

  /*
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
  */

  // Subscription
  // if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.contacts.read.includes(entry)) ) {
  //   const contactSubscriptionResult = await subscriptionWorker.contacts.handleSubscriptions(microsoft, data)
  //   if ( !contactSubscriptionResult.status ) {
  //     await handleException('Job Error - Microsoft Sync Failed [contacts-subscription]', contactSubscriptionResult.ex)
  //     return
  //   }
  //   Context.log('SyncMicrosoft - contactSubscriptionResult', data.microsoftCredential.email, contactSubscriptionResult)
  // }

  if ( data.microsoftCredential.scope.some(entry => config.microsoft_scopes.mail.read.includes(entry)) ) {
    const messageSubscriptionResult = await subscriptionWorker.messages.handleSubscriptions(microsoft, data)
    if ( !messageSubscriptionResult.status ) {
      await handleException('Job Error - Microsoft Sync Failed [messages-subscription]', messageSubscriptionResult.ex)
      return
    }
    Context.log('SyncMicrosoft - messageSubscriptionResult', data.microsoftCredential.email, messageSubscriptionResult)
  }


  sync_duration = new Date().getTime() - sync_start_time.getTime()

  // Update as Success
  await MicrosoftCredential.updateLastSync(data.microsoftCredential.id, sync_duration)
  await addLastSyncRecord(true)

  Socket.send('Microsoft.Contacts.Imported', data.microsoftCredential.user, [synced_contacts_num + extracted_contacts_num])
  Context.log('SyncMicrosoft - job Finish', data.microsoftCredential.email, sync_duration)

  return
}

// {
//   resourceData: {
//     '@odata.type': '#Microsoft.Graph.Message',
//     '@odata.id': 'Users/be0c5244-9c34-4439-8806-c224613eea09/Messages/AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA=',
//     '@odata.etag': 'W/"CQAAABYAAADC2sKTjOSNTpsi5KIF1ip6AAES7p9m"',
//     id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA='
//   }
// }


const handleMessageNotif = async (data) => {
  if ( data.clientState !== SUBSCRIPTION_SECRET ) {
    Context.log('Bad-Microsoft-Notification, Invalid State')
    return
  }

  // data.subscriptionId: '522a3ead-78d8-46db-a052-cd84611da5e0',
  // data.subscriptionExpirationDateTime
  // data.changeType: 'updated created deleted'
  // data.resource: 'users/id/messages/id'
  // data.resourceData: {
  //   '@odata.type': '#Microsoft.Graph.Message',
  //   '@odata.id': 'Users/be0c5244-9c34-4439-8806-c224613eea09/Messages/AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA=',
  //   '@odata.etag': 'W/"CQAAABYAAADC2sKTjOSNTpsi5KIF1ip6AAES7p9m"',
  //   id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAETBR40AAA='
  // }

  const changeType   = data.changeType
  const resourceType = data.resourceData['@odata.type']
  const resourceId   = data.resourceData.id

  const subscription = await MicrosoftSubscription.getByRemoteId(data.subscriptionId)

  console.log('\n\n')
  console.log('***** subscription', subscription)
  console.log('***** handleMessageNotif', data)
  console.log('\n\n')

  return
}

const handleContactNotif = async (data) => {

}

module.exports = {
  syncMicrosoft,
  handleMessageNotif,
  handleContactNotif
}