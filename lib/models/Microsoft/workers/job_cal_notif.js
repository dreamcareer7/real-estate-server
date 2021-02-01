const Slack   = require('../../Slack')
const Context = require('../../Context')

const { get } = require('../credential/get')
const MicrosoftSubscription = require('../subscription')
const calendarPublisher     = require('./publisher/calendar/calendar')



const handleNotifications = async (data) => {
  try {
    Context.log('SyncOutlookCalNotifications - getByRemoteId', JSON.stringify(data.payload))
    const subscription = await MicrosoftSubscription.getByRemoteId(data.payload.subscriptionId)

    if (!subscription) {
      return
    }

    Context.log('SyncOutlookCalNotifications - get', data.payload)
    const credential = await get(subscription.microsoft_credential)

    if ( credential.deleted_at || credential.revoked ) {
      return
    }

    if ( data.payload.lifecycleEvent === 'subscriptionRemoved' ) {
      Context.log('SyncOutlookCalNotifications - delete', data.payload)
      return await MicrosoftSubscription.delete(subscription.id)
    }

    /*
      If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
      await UsersJob.forceSyncByMicrosoftCredential(subscription.microsoft_credential, 'calendar')
    */

    const payload = {
      action: 'sync_microsoft_calendar',
      cid: credential.id,
      immediate: true
    }

    Context.log('SyncOutlookCalNotifications - syncCalendar', data.payload)
    calendarPublisher.syncCalendar(payload)
    Context.log('SyncOutlookCalNotifications - syncCalendar done', data.payload)

  } catch (ex) {

    Context.log(`SyncMicrosoft - OutlookCalSub - Notifications process failed - subscription: ${data.payload.subscriptionId} - Ex: ${ex.statusCode} ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - StatusCode: ${ex.statusCode} - Message: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel: 'integration_logs', text, emoji })

    return
  }
}


module.exports = {
  handleNotifications
}