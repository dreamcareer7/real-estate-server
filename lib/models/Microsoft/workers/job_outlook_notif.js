const Context = require('../../Context')
const Slack   = require('../../Slack')

const UsersJob = require('../../../models/UsersJob')

const subscriptionWorkers   = require('./subscriptions/messages')
const MicrosoftCredential   = require('../credential')
const MicrosoftSubscription = require('../subscription')
// const outlookPublisher   = require('./publisher/outlook/outlook')


const handleNotifications = async (data) => {
  try {

    Context.log('microsoft-parser-webhooks handleNotifications', data.payload)

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
      await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')

      /*
        Buggy! doesn't work!!!

        const payload = {
          action: 'sync_outlook',
          cid: credential.id,
          immediate: true
        }

        outlookPublisher.syncOutlook(payload)
      */
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
  
        Context.log('microsoft-parser-webhooks handleNotifications result', result)

        if (result) {
          await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')

          /*
            Buggy! doesn't work!!!
            const payload = {
              action: 'sync_outlook',
              cid: credential.id,
              immediate: true
            }

            outlookPublisher.syncOutlook(payload)
          */
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
  handleNotifications
}