const async  = require('async')

const promisify = require('../../../utils/promisify')

const createContext = require('../../../../scripts/workers/utils/create-context')

const config  = require('../../../config')
const Context = require('../../Context')
const Slack   = require('../../Slack')

const { forceSyncByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { get } = require('../credential/get')
const MicrosoftSubscription = require('../subscription')
const subscriptionWorkers   = require('./subscriptions/messages')

const channel = config.microsoft_integration.slack_channel
// const maxTime = 5000



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

    // nothing to do
    if ( (ex.code === 'ESOCKETTIMEDOUT') || (ex.message === 'Error: ESOCKETTIMEDOUT') ) {
      return
    }

    Context.log(`SyncMicrosoft - OutlookSub - Notifications process failed - subscription: ${data.payload.subscriptionId} - Ex: ${ex.statusCode} ${ex}`)

    const text  = `SyncMicrosoft - Notifications process failed - subscription: ${data.payload.subscriptionId} - StatusCode: ${ex.statusCode} - Message: ${ex.message}`
    const emoji = ':skull:'

    Slack.send({ channel, text, emoji })

    return
  }
}

/*
  const timer = async (data) => {  
    const tid = setTimeout(function() {
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
*/

let i = 0
const wrapper = async (payload, cb) => {
  try {
    const { commit, rollback, run } = await createContext({
      id: `process-microsoftNotifications-${i++}`
    })

    await run(async () => {
      try {
        await handler(payload)
        await commit()
      } catch(e) {
        rollback(e)
        throw e
      }
    })
    return cb()

  } catch(e) {
    const text  = `Retrying subscription queue job: ${e.statusCode} - Message: ${e.message}`
    const emoji = ':skull:'

    Slack.send({ channel, text, emoji })

    Context.error(text, e)

    /*
     * It's very important for microsoft messages to be processed in the order they come in.
     * Therefore, if a job fails, we cannot go to the next. Retry!
     */
    setTimeout(() => {
      wrapper(payload, cb)
    }, 10000)
  }
}

const queues = {}

const handleNotifications = async (data) => {
  const { subscriptionId } = data.payload
  if (!queues[subscriptionId])
    queues[subscriptionId] = async.queue(wrapper, 1)

  const queue = queues[subscriptionId]

  return promisify(queue.push.bind(queue))(data)
}


module.exports = {
  handleNotifications
}
