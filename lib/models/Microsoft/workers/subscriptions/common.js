const config = require('../../../../config')

const MicrosoftSubscription = require('../../subscription')
const MicrosoftCalendar     = require('../../calendar')
const { getMGraphClient }   = require('../../plugin/client.js')

const SUBSCRIPTION_SECRET = config.microsoft_integration.subscription_secret



const getMicrosoftClient = async (credential) => {
  const { microsoft } = await getMGraphClient(credential)

  if (!microsoft) {
    throw new Error('Microsoft HandleUpdateEvents Is skipped, Client is failed')
  }

  return microsoft
}

const createNewSubscriptions = async (microsoft, cid, resource) => {
  const expirationDate     = new Date()
  const expirationDateTime = new Date(expirationDate.setDate(expirationDate.getDate() + 2))
  const clientState        = SUBSCRIPTION_SECRET
  const changeType         = 'created,updated,deleted'

  let notificationUrl = `https://${process.env.API_HOSTNAME}/webhook/microsoft/outlook`

  if ( process.env.NODE_ENV === 'tests' ) {
    notificationUrl = 'https://682855e1.ngrok.io/webhook/microsoft/outlook'
  }

  const params = {
    changeType,
    notificationUrl,
    resource,
    expirationDateTime,
    clientState
  }

  const sub = await microsoft.createSubscription(params)

  const body = {
    'microsoft_credential': cid,
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

const getToSyncCalendars = async function (gcid) {
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(gcid)

  const toSync = calendars.filter(cal => cal.to_sync)

  return toSync
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
  createNewSubscriptions,
  updateSubscriptions,
  getToSyncCalendars,
  generateCalendarEventRecord,
  generateCrmTaskRecord,
  fetchEvents
}