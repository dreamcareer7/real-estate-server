const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftSubscription = require('../../subscription')

const SUBSCRIPTION_SECRET = config.microsoft_integration.subscription_secret



const createNewSubscriptions = async (microsoft, data) => {
  const exDate = new Date()
  exDate.setDate(exDate.getDate() + 2)

  const params = {
    changeType: 'created,updated,deleted',
    // notificationUrl: 'https://682855e1.ngrok.io/webhook/microsoft/outlook',
    notificationUrl: `https://${process.env.API_HOSTNAME}/webhook/microsoft/outlook`,
    resource: '/me/messages',
    expirationDateTime: new Date(exDate),
    clientState: SUBSCRIPTION_SECRET
  }

  const sub = await microsoft.createSubscription(params)

  const body = {
    'microsoft_credential': data.microsoftCredential.id,
    'subscription_id': sub.id,
    'resource': sub.resource,
    'change_type': sub.changeType,
    'client_state': sub.clientState,
    'notification_url': sub.notificationUrl,
    'expiration_date_time': sub.expirationDateTime,
    'creator_id': sub.creatorId,
    'application_id': sub.applicationId
  }

  await MicrosoftSubscription.create(body)

  return {
    status: true,
    ex: null
  }
}

const updateSubscriptions = async (microsoft, sub) => {
  const exDate = new Date()
  exDate.setDate(exDate.getDate() + 2)

  const params = {
    'expirationDateTime': exDate
  }

  await microsoft.updateSubscription(sub.subscription_id, params)
  await MicrosoftSubscription.updateExpirationDateTime(sub.id, exDate)

  return {
    status: true,
    ex: null
  }
}

const handleSubscriptions = async (microsoft, data) => {
  try {

    // const list = await microsoft.listSubscriptions()
    // Context.log('list', list)

    // for (const rec of list.value) {
    //   await microsoft.deleteSubscription(rec.id)
    // }

    const subscription = await MicrosoftSubscription.getByResource(data.microsoftCredential.id, '/me/messages')
    Context.log('***** OutlookSub handleSubscriptions subscription', subscription)

    if (subscription) {
      const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

      if (!liveSubscription) {
        Context.log('***** OutlookSub handleSubscriptions, going to delete offlince record and create a new sub')
        await MicrosoftSubscription.delete(subscription.id)
        return await createNewSubscriptions(microsoft, data)
      }

      if ( subscription.subscription_id !== liveSubscription.id ) {
        Context.log('***** OutlookSub handleSubscriptions, going to delete offlince/remote records and create a new sub')
        await MicrosoftSubscription.delete(subscription.id)
        await microsoft.deleteSubscription(liveSubscription.id)
        return await createNewSubscriptions(microsoft, data)
      }

      const now = new Date().getTime()
      const exp = new Date(liveSubscription.expiration_date_time).getTime()
      const gap = 60 * 60 * 1000

      if ( (exp - now) / gap < 24 ) {
        Context.log('***** OutlookSub handleSubscriptions, going to update sub')
        return await updateSubscriptions(microsoft, subscription)
      }
    }    
    
    if (!subscription) {
      Context.log('***** OutlookSub handleSubscriptions, fresh sub')
      return await createNewSubscriptions(microsoft, data)
    }

    Context.log('***** OutlookSub handleSubscriptions, nothing to do')

    return {
      status: true,
      ex: null
    }

  } catch(ex) {

    Context.log('***** OutlookSub handleSubscriptions - Mesaages - HandleSubscriptions failed', data.microsoftCredential.id, ex)

    return {
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  handleSubscriptions
}