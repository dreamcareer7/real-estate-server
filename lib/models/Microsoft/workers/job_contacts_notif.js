const Slack   = require('../../Slack')
const Context = require('../../Context')

const { get } = require('../credential/get')
const MicrosoftSubscription = require('../subscription')
const { syncContacts } = require('./publisher/contacts/contacts')



const handleNotifications = async (data) => {
  try {
    Context.log('SyncOutlookContactsNotifications - getByRemoteId', JSON.stringify(data.payload))
    const subscription = await MicrosoftSubscription.getByRemoteId(data.payload.subscriptionId)

    if (!subscription) {
      return
    }

    Context.log('SyncOutlookContactsNotifications - get', data.payload.subscriptionId)
    const credential = await get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.payload.lifecycleEvent === 'subscriptionRemoved' ) {
      Context.log('SyncOutlookContactsNotifications - delete', data.payload.subscriptionId)
      return await MicrosoftSubscription.delete(subscription.id)
    }

    /*
      If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
      await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'calendar')
    */

    const payload = {
      action: 'sync_microsoft_contact',
      cid: credential.id,
      immediate: true,
      origin: 'notifications' // To bypass the Extract-Contacts section
    }

    Context.log('SyncOutlookContactsNotifications - syncContacts', data.payload.subscriptionId)
    syncContacts(payload)
    Context.log('SyncOutlookContactsNotifications - syncContacts Done', data.payload.subscriptionId)

  } catch (ex) {

    Context.log(`SyncMicrosoft - OutlookContactsSub - Notifications process failed - subscription: ${data.payload.subscriptionId} - Ex: ${ex.statusCode} ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - StatusCode: ${ex.statusCode} - Message: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  handleNotifications
}