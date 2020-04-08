const config = require('../../../../config')

const MicrosoftSubscription = require('../../subscription')
const SUBSCRIPTION_SECRET   = config.microsoft_integration.subscription_secret



const subscribe = async (microsoft, credentialId, resource) => {
  // Handle duplicate subscription
  const currentSub = await MicrosoftSubscription.getByResource(credentialId, resource)
  if ( currentSub && !currentSub.deleted_at ) {
    return
  }

  const expirationDate     = new Date()
  const expirationDateTime = new Date(expirationDate.setDate(expirationDate.getDate() + 2))
  const clientState        = SUBSCRIPTION_SECRET
  const changeType         = 'created,updated,deleted'

  // const notificationUrl = `https://${process.env.API_HOSTNAME}/webhook/microsoft/outlook`
  const notificationUrl = 'https://439a0ea9.ngrok.io/webhook/microsoft/outlook'

  const params = {
    changeType,
    notificationUrl,
    resource,
    expirationDateTime,
    clientState
  }

  const sub = await microsoft.createSubscription(params)

  const body = {
    'microsoft_credential': credentialId,
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

  return
}

const unsubscribe = async (microsoft, credentialId, resource) => {
  const subscription = await MicrosoftSubscription.getByResource(credentialId, resource)

  if (subscription) {
    await MicrosoftSubscription.delete(subscription.id)
    await microsoft.deleteSubscription(subscription.subscription_id)
  }

  return
}

const updateSub = async (microsoft, sub) => {
  const expirationDate     = new Date()
  const expirationDateTime = new Date(expirationDate.setDate(expirationDate.getDate() + 2))

  const params = { expirationDateTime }

  await microsoft.updateSubscription(sub.subscription_id, params)
  await MicrosoftSubscription.updateExpirationDateTime(sub.id, expirationDateTime)

  return
}


module.exports = {
  subscribe,
  unsubscribe,
  updateSub
}