const Slack   = require('../../Slack')
const Context = require('../../Context')

const { forceSyncByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { get } = require('../credential/get')
const MicrosoftSubscription = require('../subscription')
const subscriptionWorkers   = require('./subscriptions/messages')

const maxTime = 5000



const handler = async (data) => {
  try {
    const subscription = await MicrosoftSubscription.getByRemoteId(data.payload.subscriptionId)

    if (!subscription) {
      return
    }

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
        return await subscriptionWorkers.events.handleDeleteEvent(credential, data.payload.resourceData.id)
      }

      if ( data.payload.changeType === 'updated' ) {
        return await subscriptionWorkers.events.handleUpdateEvents(credential, data.payload.resourceData.id)
      }

      if ( data.payload.changeType === 'created' ) {
        const result = await subscriptionWorkers.events.handleCreateEvents(credential, data.payload.resourceData.id)

        if (result) {
          await forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'outlook')
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

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - StatusCode: ${ex.statusCode} - Message: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}

const timer = async (data) => {  
  let tid = setTimeout(function() {
    Context.log('SyncOutlookNotifications - timeout', data.payload.subscriptionId)
    throw new Error('Sync OutlookNotifications Timeout!')
  }, maxTime)

  await handler(data)

  if (tid) {
    clearTimeout(tid)
  }
}

const handleNotifications = async (data) => {
  await timer(data)
}


module.exports = {
  handleNotifications
}