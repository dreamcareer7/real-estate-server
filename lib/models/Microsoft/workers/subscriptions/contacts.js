const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential   = require('../../credential')
const MicrosoftContact      = require('../../contact')
const MicrosoftMessage      = require('../../message')
const MicrosoftSubscription = require('../../subscription')

const Contact = require('../../../Contact/index')



const createNewSubscriptions = async (microsoft, data) => {
  const TS     = new Date(data.microsoft.last_sync_at || new Date())
  const exDate = new Date(TS)

  exDate.setDate(exDate.getDate() + 1)

  const params = {
    changeType: 'created,updated,deleted',
    notificationUrl: 'https://xxxxxxxxx:3078/webhook/microsoft',
    resource: 'me/contacts',
    expirationDateTime: new Date(exDate),
    clientState: 'secretClientValue'
  }

  const sub = await microsoft.createSubscription(params)

  const body = {
    'microsoft_credential': data.microsoft_credential.id,
    'subscription_id': sub.id,
    'resource': sub.resource,
    'change_type': sub.changeType,
    'client_state': sub.clientState,
    'notification_url': sub.notificationUrl,
    'expiration_date_time': sub.expirationDateTime,
    'creator_id': sub.creatorId,
    'application_id': sub.applicationId
  }

  const result = await MicrosoftSubscription.create(body)


  return {
    status: null,
    ex: null
  }
}

const updateSubscriptions = async (microsoft, data, subscriptions) => {
  const TS     = new Date(data.microsoft.last_sync_at || new Date())
  const exDate = new Date(TS)

  exDate.setDate(exDate.getDate() + 1)

  for (const sub of subscriptions) {
    const params = {
      'expirationDateTime': exDate
    }
  
    await microsoft.updateSubscription(sub.subscription_id, params)
    await MicrosoftSubscription.updateExpirationDateTime(sub.id, exDate)
  }

  return {
    status: null,
    ex: null
  }
}


const handleSubscriptions = async (microsoft, data) => {
  const allSubscriptions = await MicrosoftSubscription.getByCredential(data.microsoftCredential)
  const subscriptions    = allSubscriptions.filter(rec => { if ( rec.resource === 'me/contacts' ) return true })

  if ( subscriptions.length === 0 )
    return await createNewSubscriptions(microsoft, data)

  return await updateSubscriptions(microsoft, data, subscriptions)
}


module.exports = {
  handleSubscriptions
}