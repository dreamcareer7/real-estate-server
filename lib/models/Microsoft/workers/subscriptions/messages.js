const Context = require('../../../Context')

const MicrosoftSubscription = require('../../subscription')
const { subscribe, updateSub } = require('./common')



const handleSubscriptions = async (microsoft, data) => {
  const resource     = '/me/messages'
  const credentialId = data.microsoftCredential.id

  try {

    const subscription = await MicrosoftSubscription.getByResource(credentialId, '/me/messages')

    if (!subscription) {
      return await subscribe(microsoft, credentialId, resource)
    }


    // If subscription exists
    const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

    if (!liveSubscription) {
      await MicrosoftSubscription.delete(subscription.id)
      return await subscribe(microsoft, credentialId, resource)
    }

    if ( subscription.subscription_id !== liveSubscription.id ) {
      await MicrosoftSubscription.delete(subscription.id)
      await microsoft.deleteSubscription(liveSubscription.id)
      return await subscribe(microsoft, credentialId, resource)
    }

    const now = new Date().getTime()
    const exp = new Date(liveSubscription.expiration_date_time).getTime()
    const gap = 60 * 60 * 1000

    if ( (exp - now) / gap < 24 ) {
      return await updateSub(microsoft, subscription)
    }

    return {
      status: true,
      ex: null
    }

  } catch(ex) {

    Context.log(`SyncMicrosoft - handleSubscriptions - catch ex => Email: ${data.microsoftCredential.email}, Code: ${ex.statusCode}, Message: ${ex.message}`)

    if ( ex.statusCode === 504 || ex.statusCode === 503 || ex.statusCode === 501 || ex.message === 'Error: read ECONNRESET' ) {
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