const MicrosoftSubscription = require('../../../subscription')
const { subscribe, updateSub } = require('../common')


const evaluateSubscription = async (microsoft, credentialId, subscription, resource) => {
  const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

  if (!liveSubscription) {
    await MicrosoftSubscription.delete(subscription.id)
    await subscribe(microsoft, credentialId, resource)

  } else if ( subscription.subscription_id !== liveSubscription.id ) {

    await MicrosoftSubscription.delete(subscription.id)
    await microsoft.deleteSubscription(liveSubscription.id)
    await subscribe(microsoft, credentialId, resource)

  } else {

    const now = new Date().getTime()
    const exp = new Date(liveSubscription.expiration_date_time).getTime()
    const gap = 60 * 60 * 1000

    if ( (exp - now) / gap < 24 ) {
      await updateSub(microsoft, subscription)
    }
  }
}

const manageSubscriptions = async (microsoft, credential) => {
  const resource     = '/me/contacts'
  const credentialId = credential.id

  try {

    const subscription = await MicrosoftSubscription.getByResource(credentialId, resource)

    if (!subscription) {
      await subscribe(microsoft, credentialId, resource)
    } else {
      await evaluateSubscription(microsoft, credentialId, subscription, resource)
    }

    return {
      status: true,
      ex: null
    }

  } catch(ex) {

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
  manageSubscriptions
}