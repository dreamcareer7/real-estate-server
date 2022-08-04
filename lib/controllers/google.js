const am     = require('../utils/async_middleware.js')
const config = require('../config')
const Url    = require('../models/Url')
const Brand  = require('../models/Brand')

const UsersJob       = require('../models/UsersJob')
const GoogleAuthLink = require('../models/Google/auth_link')
const GoogleMessage  = require('../models/Google/message')

const { getRemoteGoogleCalendars, configureCalendars } = require('../models/Google/calendar/upsert')
const { get, getByUser } = require('../models/Google/credential/get')
const { disconnect: disconnectCredential } = require('../models/Google/credential/update')
const { Disconnect } = require('../models/Google/workers')

const debouncer = require('../models/Google/debouncer')

const SUBSCRIPTION_ID = config.google_integration.subscription.id

const { sendSlackMessage, checkCredentialUser, checkModifyAccess } = require('../models/Google/common')



function getCurrentBrand () {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}

function brandAccess (req, res, next) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}


const requestGmailAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || Url.web({ uri: '/dashboard/contacts' })
  const type     = 'google_auth_link'
  const scopes   = ['contacts', 'contacts.other.readonly', 'gmail.readonly', 'gmail.send', 'calendar']

  const url = await GoogleAuthLink.requestGmailAccess(user, brand, scopes, redirect)

  return res.json({
    code: 'OK',
    data: {
      url,
      redirect,
      type
    }
  })
}

const grantAccess = async function (req, res) {  
  if (req.query.error === 'access_denied') {
    const url = Url.web({ uri: '/dashboard' })
    return res.redirect(url)
  }

  if (!req.query.code) {
    throw Error.BadRequest('Code is not specified.')
  }

  if (!req.query.state) {
    throw Error.BadRequest('State is not specified.')
  }

  if (!req.query.scope) {
    throw Error.BadRequest('Scope is not specified.')
  }

  const { redirect } = await GoogleAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getGoogleProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  
  const credentials = await getByUser(user, brand)

  return res.collection(credentials)
}

const getGoogleProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await get(req.params.id)

  checkCredentialUser(credential, user, brand)

  return res.model(credential)
}

const disconnect = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if ( credential.deleted_at || credential.revoked ) {
    return res.model(credential)
  }

  await disconnectCredential(credential.id)
  Disconnect.credential({ id: credential.id })

  const updated_credential = await get(credential.id)
  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await get(req.params.id)

  checkCredentialUser(credential, user, brand)

  await UsersJob.forceSyncByGoogleCredential(credential.id, 'gmail')
  await UsersJob.forceSyncByGoogleCredential(credential.id, 'contacts')
  await UsersJob.forceSyncByGoogleCredential(credential.id, 'calendar')

  const updated_credential = await get(credential.id)

  return res.model(updated_credential)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ gcid: UUID; mid: UUID; }, {}, { status: boolean }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const updateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageId  = req.params.mid
  const credential = await get(req.params.gcid)

  checkModifyAccess(credential, user, brand)

  try {
    await GoogleMessage.updateReadStatus(credential.id, [messageId], Boolean(req.body.status))
  } catch (ex) {
    const text = `Gmail-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ gcid: UUID }, {}, { status: boolean, messageIds: Array }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const batchUpdateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await get(req.params.gcid)

  checkModifyAccess(credential, user, brand)

  try {
    await GoogleMessage.updateReadStatus(credential.id, messageIds, Boolean(req.body.status))
  } catch (ex) {
    const text = `Gmail-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const batchTrash = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await get(req.params.gcid)

  checkModifyAccess(credential, user, brand)

  try {
    await GoogleMessage.batchTrash(credential.id, messageIds)
  } catch (ex) {
    const text = `Gmail-Trash-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const batchArchive = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageIds = req.body.messageIds
  const credential = await get(req.params.gcid)

  checkModifyAccess(credential, user, brand)

  try {
    await GoogleMessage.batchArchive(credential.id, messageIds)
  } catch (ex) {
    const text = `Gmail-Archive-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const getRemoteCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  const credential = await get(gcid)

  checkCredentialUser(credential, user, brand)

  if (credential.scope_summary && !credential.scope_summary.includes('calendar')) {
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
  }

  const response = await getRemoteGoogleCalendars(credential)

  return res.model(response)
}

const configureGCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  const credential = await get(gcid)

  checkCredentialUser(credential, user, brand)

  if (credential.scope_summary && !credential.scope_summary.includes('calendar')) {
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
  }

  const temp       = req.body.toSync || []
  const toStopSync = req.body.toStopSync || []

  const toSync = temp.filter(c => { if (!toStopSync.includes(c)) return true })
  const length = toSync.length + toStopSync.length

  if ( length === 0 ) {
    return res.status(204).end()
  }

  await configureCalendars(credential, { toSync, toStopSync })

  return res.status(204).end()
}

const gmailHooksMid = async function (req, res, next) {
  if ( req.body.subscription !== SUBSCRIPTION_ID ) {
    return res.status(200).end()
  }

  /*
    Sample incoming request:

    req.body = {
      message: {
        // This is the actual notification data, as base64url-encoded JSON ==> {"emailAddress": "user@example.com", "historyId": "9876543210"}
        data: "eyJlbWFpbEFkZHJlc3MiOiAidXNlckBleGFtcGxlLmNvbSIsICJoaXN0b3J5SWQiOiAiMTIzNDU2Nzg5MCJ9",

        // This is a Cloud Pub/Sub message id, unrelated to Gmail messages.
        message_id: "1234567890",
        messageId: '1234567890',

        publishTime: '2020-01-18T13:45:54.934Z',
        publish_time: '2020-01-18T13:45:54.934Z'
      }

      subscription: "projects/quickstart-1551860259096/subscriptions/alpine-gmail-sub"
    }
  */

  return next()
}

const debounceGmailHooks = async function (req, res) {
  const buff = Buffer.from(req.body.message.data, 'base64')
  const body = JSON.parse(buff.toString('utf-8'))

  debouncer.gmail(body.emailAddress)

  return res.status(200).end()
}

const calendarHooksMid = async function (req, res, next) {
  const state = req.headers['x-goog-resource-state'] || ''

  if ( state.toLowerCase() === 'sync' ) {
    return res.status(200).end()  
  }

  /*
    List of headers of incoming request:
      'x-goog-channel-id': '79f9ae02-bc3f-440e-a438-fcde101bae6b'
      'x-goog-channel-token': '7c9a6fb9-4e95-49a3-b44a-a9fe6a345e9a' (calendarId)
      'x-goog-channel-expiration': 'Mon, 13 Jan 2020 17:17:03 GMT'
      'x-goog-resource-state': 'exists'
      'x-goog-resource-id': '_TTpBl_68SpxpmfZ1cnLA0az34Y'
      'x-goog-resource-uri': 'https://www.googleapis.com/calendar/v3/calendars/ro38nlt03gs1jee2kb5plvoj1c@group.calendar.google.com/events?maxResults=250&alt=json'

    Debounce key structure:
      debouce_key = channelId vs calendarId.channelId.resourceId
  */

  return next()
}

const debounceCalendarHooks = async function (req, res) {
  const payload = {
    calId: req.headers['x-goog-channel-token'],
    chId: req.headers['x-goog-channel-id'],
    rId: req.headers['x-goog-resource-id']
  }

  debouncer.calendar(JSON.stringify(payload))
  
  return res.status(200).end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfiles))
  app.get('/users/self/google/:id', auth, brandAccess, am(getGoogleProfile))

  app.delete('/users/self/google/:id', auth, brandAccess, am(disconnect)) // Disconnect Button On Web-App
  app.post('/users/self/google/:id/sync', auth, brandAccess, am(forceSync)) // Sync now Button On Web-App

  app.put('/emails/google/:gcid/messages/:mid', auth, brandAccess, am(updateReadStatus))
  app.put('/emails/google/:gcid/messages', auth, brandAccess, am(batchUpdateReadStatus))
  app.post('/emails/google/:gcid/trash', auth, brandAccess, am(batchTrash))
  app.post('/emails/google/:gcid/archive', auth, brandAccess, am(batchArchive))

  app.get('/users/google/:gcid/calendars', auth, brandAccess, am(getRemoteCalendars))
  app.post('/users/google/:gcid/conf', auth, brandAccess, am(configureGCalendars))

  app.get('/webhook/google/grant', am(grantAccess))
  app.all('/webhook/google/gmail', am(gmailHooksMid), am(debounceGmailHooks))
  app.all('/webhook/google/calendars', am(calendarHooksMid), am(debounceCalendarHooks))
}

module.exports = router