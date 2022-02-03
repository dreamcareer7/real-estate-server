const Context = require('../../../../Context')
const MicrosoftSubscription = require('../../../subscription')
const { subscribe, updateSub } = require('../common')
// const Context   = require('../../../../Context')

const evaluateSubscription = async (microsoft, credentialId, subscription, resource) => {
  const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

  if (!liveSubscription) {
    await MicrosoftSubscription.delete(subscription.id)
    await subscribe(microsoft, credentialId, resource)
    Context.log('SyncOutlookMessages Subscription - refresh subscription', JSON.stringify({subscriptionId: subscription.id, liveSubscription}))
  } else if ( subscription.subscription_id !== liveSubscription.id ) {

    await MicrosoftSubscription.delete(subscription.id)
    await microsoft.deleteSubscription(liveSubscription.id)
    await subscribe(microsoft, credentialId, resource)
    Context.log('SyncOutlookMessages Subscription - delete microsoft', JSON.stringify({subscriptionId: subscription.id, liveSubscription}))
  } else {

    const now = new Date().getTime()
    const exp = new Date(liveSubscription.expiration_date_time).getTime()
    const gap = 60 * 60 * 1000

    if ( (exp - now) / gap < 24 ) {
      await updateSub(microsoft, subscription)
    }
    Context.log('SyncOutlookMessages Subscription - update subscription', JSON.stringify({subscriptionId: subscription.id, liveSubscription}))
  }
  // TODO(Amin): Delete me after migration test
  // } catch (ex) {
  //   if (ex.statusCode === 403) {
  //     Context.log('SyncOutlookMessages - SubscriptionRefined - subscription.id', subscription.id)
  //     await MicrosoftSubscription.delete(subscription.id)
  //     await subscribe(microsoft, credentialId, resource)
  //     return
  //   } 
  //   throw ex
  // }
}

const handleSubscriptions = async (microsoft, credential) => {
  const resource     = '/me/messages'
  const credentialId = credential.id
  try {

    const subscription = await MicrosoftSubscription.getByResource(credentialId, resource)

    if (!subscription) {
      Context.log('SyncOutlookMessages Subscription - handel subscription', JSON.stringify({subscription}))
      await subscribe(microsoft, credentialId, resource)
    } else {
      Context.log('SyncOutlookMessages Subscription - evaluate subscription', JSON.stringify({subscription}))
      await evaluateSubscription(microsoft, credentialId, subscription, resource)
    }

    return {
      status: true,
      ex: null
    }

  } catch(ex) {
    Context.log('SyncOutlookMessages Subscription - catch', JSON.stringify({ex}))
    const fiveXErr = [500, 501, 502, 503, 504]
    if ( fiveXErr.includes(Number(ex.statusCode)) || ex.message === 'Error: read ECONNRESET' ) {    
      return  {
        status: false,
        skip: true,
        ex
      }
    }

    return  {
      status: false,
      skip: false,
      ex
    }
  }
}


module.exports = {
  handleSubscriptions
}
