const Slack   = require('../../Slack')
const Context = require('../../Context')

const { forceSyncByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { get } = require('../credential/get')
const MicrosoftSubscription = require('../subscription')
const subscriptionWorkers   = require('./subscriptions/messages')



const handleNotifications = async (data) => {
  try {
    Context.log('SyncOutlookNotifications - getByRemoteId', JSON.stringify(data.payload))
    const subscription = await MicrosoftSubscription.getByRemoteId(data.payload.subscriptionId)

    if (!subscription) {
      return
    }

    Context.log('SyncOutlookNotifications - get', data.payload.subscriptionId)
    const credential = await get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.payload.lifecycleEvent === 'subscriptionRemoved' ) {
      return await MicrosoftSubscription.delete(subscription.id)
    }

    if ( data.payload.lifecycleEvent === 'missed' ) {
      await forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')
    }

    if ( subscription.resource === '/me/messages' ) {
  
      if ( data.payload.changeType === 'deleted' ) {
        Context.log('SyncOutlookNotifications - handleDeleteEvent', data.payload.subscriptionId)
        return await subscriptionWorkers.events.handleDeleteEvent(credential, data.payload.resourceData.id)
      }

      if ( data.payload.changeType === 'updated' ) {
        Context.log('SyncOutlookNotifications - handleUpdateEvents', data.payload.subscriptionId)
        return await subscriptionWorkers.events.handleUpdateEvents(credential, data.payload.resourceData.id)
      }

      if ( data.payload.changeType === 'created' ) {
        Context.log('SyncOutlookNotifications - handleCreateEvents', data.payload.subscriptionId)
        const result = await subscriptionWorkers.events.handleCreateEvents(credential, data.payload.resourceData.id)

        if (result) {
          Context.log('SyncOutlookNotifications - forceSyncByMicrosoftCredential', data.payload.subscriptionId)
          await forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')
        }

        Context.log('SyncOutlookNotifications - done', result, data.payload.subscriptionId)
        return
      }
    }

  } catch (ex) {

    // nothing to do
    if ( ex.statusCode === 429 ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookSub - Notifications process failed - subscription: ${data.payload.subscriptionId} - Ex: ${ex.statusCode} ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - StatusCode: ${ex.statusCode} - Message: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  handleNotifications
}