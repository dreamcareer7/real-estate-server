const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential   = require('../../credential')
const MicrosoftContact      = require('../../contact')
const MicrosoftMessage      = require('../../message')
const MicrosoftSubscription = require('../../subscription')

const Contact = require('../../../Contact/index')
const Email   = require('../../../Email/index.js')


const createNewSubscriptions = async (microsoft, data) => {
  const exDate = new Date()
  exDate.setDate(exDate.getDate() + 2)

  const params = {
    changeType: 'created,updated,deleted',
    notificationUrl: 'https://46445329.ngrok.io/webhook/microsoft',
    resource: '/me/messages',
    expirationDateTime: new Date(exDate),
    clientState: 'secretClientValue'
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

    const subscription = await MicrosoftSubscription.getByResource(data.microsoftCredential.id, '/me/messages')

    if (subscription) {
      const liveSubscription = await microsoft.getSubscription(subscription.subscription_id)

      if (!liveSubscription) {
        await MicrosoftSubscription.delete(subscription.id)
        return await createNewSubscriptions(microsoft, data)
      }

      if ( subscription.subscription_id !== liveSubscription.id ) {
        await MicrosoftSubscription.delete(subscription.id)
        await microsoft.deleteSubscription(liveSubscription.id)

        return await createNewSubscriptions(microsoft, data)
      }

      return await updateSubscriptions(microsoft, subscription)
    }    
    
    if (!subscription) {
      return await createNewSubscriptions(microsoft, data)
    }

  } catch(ex) {
    Context.log('-------------------- messages', ex)

    return {
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  handleSubscriptions
}