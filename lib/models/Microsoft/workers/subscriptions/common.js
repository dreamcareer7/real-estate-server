const config = require('../../../../config')

const MicrosoftSubscription = require('../../subscription')
const { getMGraphClient }   = require('../../plugin/client.js')

const SUBSCRIPTION_SECRET = config.microsoft_integration.subscription_secret



const getMicrosoftClient = async (credential) => {
  const { microsoft } = await getMGraphClient(credential)

  if (!microsoft) {
    throw new Error('Microsoft HandleUpdateEvents Is skipped, Client is failed')
  }

  return microsoft
}

const subscribeCalendar = async (microsoft, calendar) => {
  // Handle duplicate subscription

  const expirationDate     = new Date()
  const expirationDateTime = new Date(expirationDate.setDate(expirationDate.getDate() + 2))
  const clientState        = SUBSCRIPTION_SECRET
  const changeType         = 'created,updated,deleted'
  const resource           = `me/calendars/${calendar.calendar_id}/events`

  // const notificationUrl = `https://${process.env.API_HOSTNAME}/webhook/microsoft/outlook`
  const notificationUrl = 'https://7b3d9814.ngrok.io/webhook/microsoft/outlook'

  const params = {
    changeType,
    notificationUrl,
    resource,
    expirationDateTime,
    clientState
  }

  const sub = await microsoft.createSubscription(params)

  const body = {
    'microsoft_credential': calendar.microsoft_credential,
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

const unsubscribeCalendar = async (microsoft, calendar) => {
  const resource = `me/calendars/${calendar.calendar_id}/events`
  
  const subscription = await MicrosoftSubscription.getByResource(calendar.microsoft_credential, resource)

  if (subscription) {
    await MicrosoftSubscription.delete(subscription.id)
    await microsoft.deleteSubscription(subscription.subscription_id)
  }

  return
}

const updateSubscriptions = async (microsoft, sub) => {
  const expirationDate     = new Date()
  const expirationDateTime = new Date(expirationDate.setDate(expirationDate.getDate() + 2))

  const params = { expirationDateTime }

  await microsoft.updateSubscription(sub.subscription_id, params)
  await MicrosoftSubscription.updateExpirationDateTime(sub.id, expirationDateTime)

  return {
    status: true,
    ex: null
  }
}

const generateCalendarEventRecord = function (calendar, event) {
  return null
}

const generateCrmTaskRecord = function (credential, event) {
}

const fetchEvents = async function (microsoft, calendar) {
}


module.exports = {
  getMicrosoftClient,
  subscribeCalendar,
  unsubscribeCalendar,
  updateSubscriptions,
  generateCalendarEventRecord,
  generateCrmTaskRecord,
  fetchEvents
}