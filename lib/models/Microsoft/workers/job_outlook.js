const config   = require('../../../config')
const Context  = require('../../Context')
const Slack    = require('../../Slack')
const UsersJob = require('../../../models/UsersJob')

const outlookWorker         = require('./outlook')
const subscriptionWorkers   = require('./subscriptions/messages')
const MicrosoftCredential   = require('../credential')
const MicrosoftSubscription = require('../subscription')

const { getMGraphClient } = require('../plugin/client.js')
const publisher = require('./publisher')



const handleException = async (credential, msg, ex) => {
  Context.log('SyncOutlookMessages handleException', msg, ex)

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

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (invalidGrant) {
    await MicrosoftCredential.disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Microsoft-Outlook Job postponed`
  const emoji = ':skull:'

  Slack.send({ channel: 'integration_logs', text, emoji })

  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'failed')

  return
}

const syncOutlook = async (data) => {
  // check to know if credential is still active
  const credential = await MicrosoftCredential.get(data.cid)
  if ( credential.revoked || credential.deleted_at ) {
    await UsersJob.deleteByMicrosoftCredential(credential.id)
    return
  }

  // check to know if there is a pending job or not
  const userJob = await UsersJob.checkLockByMicrosoftCredential(credential.id, 'outlook')
  if (!userJob) {
    // Context.log('SyncOutlookMessages - Job skipped due to a pending job')
    return
  }

  /*
    check to know if current credential/job has already done ove the specific time period
    userJob === 'waiting' ==> It means user has clicked on sync-now buttun to start immediately sync process
    userJob !== 'waiting' ==> It means the job is started by system scheduler
  */
  const diff = new Date().getTime() - new Date(userJob.start_at).getTime()
  if ( (userJob.status !== 'waiting') && (diff < config.emails_integration.outlook.miliSec) ) {
    // Context.log('SyncOutlookMessages - Job skipped due to recently finished job', credential.id, credential.email)
    return
  }

  /*
    Lock users_jobs record

    select * from users_jobs where microsoft_credential = credential.id AND job_name = 'outlook' FOR UPDATE;
    ==> lock will be released after commiting or rollbacking current transaction
  */
  await UsersJob.lockByMicrosoftCredential(credential.id, 'outlook')
  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'pending')

  // check microsoft clients
  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    Slack.send({ channel: 'integration_logs', text: `SyncMicrosoft Job Is Skipped, Client Is Failed - ${credential.id}`, emoji: ':skull:' })
    await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'failed')
    return
  }


  Context.log('SyncOutlookMessages - Job Started', credential.id, credential.email)

  const last_start_at = userJob.start_at ? new Date(userJob.start_at) : new Date(0)


  // Sync Folders
  await outlookWorker.syncFolders(microsoft, credential)

  // Outlook Subscription
  if ( credential.scope_summary.includes('mail.read') ) {
    const outlookSubscriptionResult = await subscriptionWorkers.messages.handleSubscriptions(microsoft, credential)

    if ( !outlookSubscriptionResult.status ) {
      const message = 'Job Error - Microsoft Sync Failed [subscription]'
      await handleException(credential, message, outlookSubscriptionResult.ex)
      return
    }

    Context.log('SyncOutlookMessages Subscription')
  }

  // Sync Messages
  if ( credential.scope_summary.includes('mail.read') ) {
    const syncMessagesResult = await outlookWorker.syncMessages(microsoft, credential, last_start_at)

    if ( !syncMessagesResult.status && !syncMessagesResult.skip ) {
      const message = 'Job Error - Microsoft Sync Failed [messages]'
      await handleException(credential, message, syncMessagesResult.ex)
      return
    }

    Context.log('SyncOutlookMessages - Messages')
  }

  // Update as Success
  await UsersJob.upsertByMicrosoftCredential(credential, 'outlook', 'success')
  
  Context.log('SyncOutlookMessages - Job Finished')

  return
}

const handleNotifications = async (data) => {
  try {

    Context.log('microsoft-parser-webhooks handleNotifications', data)

    const subscription = await MicrosoftSubscription.getByRemoteId(data.payload.subscriptionId)

    if (!subscription) {
      return
    }

    const credential = await MicrosoftCredential.get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.payload.lifecycleEvent === 'subscriptionRemoved' ) {
      return await MicrosoftSubscription.delete(subscription.id)
    }

    if ( data.payload.lifecycleEvent === 'missed' ) {
      /*
        If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
        await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')
      */

      const payload = {
        action: 'sync_outlook',
        cid: credential.id,
        immediate: true
      }

      publisher.Outlook.syncOutlook(syncOutlook)(payload)
    }

    if ( subscription.resource === '/me/messages' ) {
  
      if ( data.payload.changeType === 'deleted' ) {
        return await subscriptionWorkers.events.handleDeleteEvent(credential, data.payload.resourceData.id)
      }
  
      if ( data.payload.changeType === 'updated' ) {
        return await subscriptionWorkers.events.handleUpdateEvents(credential, data.payload.resourceData.id)
      }
  
      if ( data.payload.changeType === 'created' ) {
        const result = await subscriptionWorkers.events.handleCreateEvents(credential, data.payload.resourceData.id)
  
        if (result) {
          
          /*
            Context.log('SyncOutlookMessages - OutlookSub - Force Sync', credential.email, credential.id)

            If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
            await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')
          */

          const payload = {
            action: 'sync_outlook',
            cid: credential.id,
            immediate: true
          }

          publisher.Outlook.syncOutlook(syncOutlook)(payload)
        }
  
        return
      }
    }

  } catch (ex) {

    // nothing to do
    if ( ex.statusCode === 429 ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookSub - Notifications process failed - subscription: ${data.payload.subscriptionId} - Ex: ${ex.statusCode} ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - Details: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  syncOutlook,
  handleNotifications
}
