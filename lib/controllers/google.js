const _  = require('lodash')
const am = require('../utils/async_middleware.js')
const config   = require('../config')
const Context  = require('../models/Context')
const Url      = require('../models/Url')
const Brand    = require('../models/Brand')
const UserRole = require('../models/User/role')

const GoogleAuthLink    = require('../models/Google/auth_link')
const GoogleCredential  = require('../models/Google/credential')
const GoogleMessage     = require('../models/Google/message')
const GoogleSyncHistory = require('../models/Google/sync_history')
const GoogleCalendar    = require('../models/Google/calendar')

const debouncer = require('../models/Google/debouncer')

const SUBSCRIPTION_ID = config.google_integration.subscription.id

const { sendSlackMessage, checkCredentialUser, checkModifyAccess } = require('../models/Google/common')



function brandAccess (req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function getCurrentBrand () {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}


const requestGmailAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || Url.web({ uri: '/dashboard/contacts' })

  const scopes = ['contacts.readonly', 'gmail.readonly', 'gmail.send']

  if ( process.env.API_HOSTNAME === 'alpine.api.rechat.com' || process.env.API_HOSTNAME === 'boer.api.rechat.com' ) {
    scopes.push('calendar')
  }

  const roles = await UserRole.getForUser(user)
  const rolesByBrand = _.groupBy(roles, 'brand')

  if (rolesByBrand && rolesByBrand[brand]) {
    const acls = rolesByBrand[brand].flatMap(r => r.acl)
  
    if ( process.env.API_HOSTNAME === 'api.rechat.com' && acls.includes('GCal') ) {
      if ( acls.includes('GCal') ) {
        scopes.push('calendar')
      }
    }
  }

  const url = await GoogleAuthLink.requestGmailAccess(user, brand, scopes, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'google_auth_link'
    }
  })
}

const grantAccess = async function (req, res) {  
  if(req.query.error === 'access_denied') {
    const url = Url.web({ uri: '/dashboard' })
    return res.redirect(url)
  }

  if(!req.query.code)
    throw Error.BadRequest('Code is not specified.')

  if(!req.query.state)
    throw Error.BadRequest('State is not specified.')

  if(!req.query.scope)
    throw Error.BadRequest('Scope is not specified.')

  const { redirect } = await GoogleAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getGoogleProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  
  // ?associations[]=google_credential.histories

  const credentials = await GoogleCredential.getByUser(user, brand)

  return res.collection(credentials)
}

const getGoogleProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if(!req.params.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  return res.model(credential)
}

const disconnect = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked) {
    return res.model(credential)
  }

  if ( credential.sync_status === 'pending' ) {
    throw Error.BadRequest('Please wait until current sync job is finished.')
  }

  if (credential.scope_summary && credential.scope_summary.includes('mail.read')) {
    await GoogleMessage.stopWatchMailBox(credential.id)
  }

  if (credential.scope_summary && credential.scope_summary.includes('calendar')) {
    const calendars = await GoogleCalendar.getAllByGoogleCredential(credential.id)
    const toStop    = calendars.filter(cal => cal.watcher_status !== 'stopped')

    const promises = toStop.map(cal => GoogleCalendar.stopWatchCalendar(cal))
    await Promise.all(promises)
  }

  await GoogleCredential.disableSync(credential.id)
  await GoogleMessage.deleteByCredential(credential.id)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  await GoogleCredential.forceSync(credential.id)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const google_credential_id = req.params.id

  const history = await GoogleSyncHistory.getGCredentialLastSyncHistory(user, brand, google_credential_id)

  checkCredentialUser(history, user, brand)

  return res.model(history)
}

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{ gcid: UUID; mid: UUID; }, {}, { status: boolean }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
const updateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageId  = req.params.mid
  const credential = await GoogleCredential.get(req.params.gcid)

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
  const credential = await GoogleCredential.get(req.params.gcid)

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
  const credential = await GoogleCredential.get(req.params.gcid)

  checkModifyAccess(credential, user, brand)

  try {

    await GoogleMessage.batchTrash(credential.id, messageIds)

  } catch (ex) {

    const text = `Gmail-Trash-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    sendSlackMessage(text, ex)
  }

  return res.status(202).end()
}

const getRemoteGoogleCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid) {
    throw Error.BadRequest('Google-Credential-Id is not specified.')
  }

  const credential = await GoogleCredential.get(gcid)

  checkCredentialUser(credential, user, brand)

  if (credential.scope_summary && !credential.scope_summary.includes('calendar')) {
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
  }

  const response = await GoogleCalendar.getRemoteGoogleCalendars(credential)

  return res.model(response)
}

const configureCaledars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid) {
    throw Error.BadRequest('Google-Credential-Id is not specified.')
  }

  const credential = await GoogleCredential.get(gcid)

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

  await GoogleCalendar.configureCalendars(credential, { toSync, toStopSync })

  return res.status(204).end()
}


const gmailHooksMid = async function (req, res, next) {
  if ( req.body.subscription !== SUBSCRIPTION_ID ) {
    return res.status(200).end()
  }

  /*
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

const gmailHooks = async function (req, res) {
  const buff = Buffer.from(req.body.message.data, 'base64')  
  const body = JSON.parse(buff.toString('utf-8'))

  const googleCredentials = await GoogleCredential.getByEmail(body.emailAddress)

  if ( googleCredentials.length === 0 ) {
    return res.status(200).end()
  }

  for (const credential of googleCredentials) {
    if ( credential.scope_summary && credential.scope_summary.includes('mail.read') && !credential.revoked && !credential.deleted_at ) {
      try {
        /** It could be multiple credential for each emailAddress, So we dont update historyId for all og them, just publush sync signal and each credential will be handling its sync process **/
        // await GoogleCredential.updateMessagesSyncHistoryId(credential.id, body.historyId)
        await GoogleCredential.forceSync(credential.id)
        Context.log('SyncGoogle - Gmail Notif - forceSync', credential.id)
      } catch (ex) {
        // do nothing
      }
    }
  }

  return res.status(200).end()
}

const gmailHooksDebouncer = async function (req, res) {
  const buff = Buffer.from(req.body.message.data, 'base64')
  const body = JSON.parse(buff.toString('utf-8'))

  debouncer.gmail(body.emailAddress)

  return res.status(200).end()
}

const gmailHooksDebouncerTest = async function (req, res) {
  for (let i = 0; i < 12; i++) {
    Context.log('SyncGoogle-debouncer gmail', req.query.email)
    debouncer.gmail(req.query.email)
  }

  return res.status(200).end()

  // curl -X POST http://localhost:3078/webhook/google/gmail/new?email=ali
}



const calendarHooksMid = async function (req, res, next) {
  const state = req.headers['x-goog-resource-state'] || ''

  if ( state.toLowerCase() === 'sync' ) {
    return res.status(200).end()  
  }

  // 'x-goog-channel-id': '79f9ae02-bc3f-440e-a438-fcde101bae6b'
  // 'x-goog-channel-token': '7c9a6fb9-4e95-49a3-b44a-a9fe6a345e9a' (calendarId)
  // 'x-goog-channel-expiration': 'Mon, 13 Jan 2020 17:17:03 GMT'
  // 'x-goog-resource-state': 'exists'
  // 'x-goog-resource-id': '_TTpBl_68SpxpmfZ1cnLA0az34Y'
  // 'x-goog-resource-uri': 'https://www.googleapis.com/calendar/v3/calendars/ro38nlt03gs1jee2kb5plvoj1c@group.calendar.google.com/events?maxResults=250&alt=json'

  // debouce_key = channelId vs calendarId.channelId.resourceId

  return next()
}

const calendarHooks = async function (req, res) {
  const calendarId = req.headers['x-goog-channel-token']
  const channelId  = req.headers['x-goog-channel-id']
  const resourceId = req.headers['x-goog-resource-id']

  let calendar
  let credential

  try {
    calendar = await GoogleCalendar.get(calendarId)
  } catch (ex) {
    // do nothing
  }

  if (!calendar) {
    return res.status(200).end()
  }

  try {
    credential = await GoogleCredential.get(calendar.google_credential)
  } catch (ex) {
    // do nothing
  }

  if ( !credential || credential.revoked || credential.deleted_at ) {
    return res.status(200).end()
  }

  // Stop Old Channel
  if ( calendar.watcher_channel_id !== channelId ) {
    const obj = {
      google_credential: calendar.google_credential,
      watcher: {
        id: channelId,
        resourceId: resourceId
      }
    }

    await GoogleCalendar.stop(obj)

    return res.status(200).end()
  }

  try {
    await GoogleCredential.forceSyncCalendar(calendar.google_credential)
  } catch (ex) {
    // do nothing
    Context.log('SyncGoogle - Calendar Hooks - forceSync skipped', ex.message, calendar.google_credential, calendarId)
  }

  return res.status(200).end()
}

const calendarHooksDebouncer = async function (req, res) {
  const payload = {
    calendarId: req.headers['x-goog-channel-token'],
    channelId: req.headers['x-goog-channel-id'],
    resourceId: req.headers['x-goog-resource-id']
  }

  debouncer.calendar(payload.channelId, payload)
  
  return res.status(200).end()
}

const calendarHooksDebouncerTest = async function (req, res) {
  const payload = {
    calendarId: req.headers['x-goog-channel-token'],
    channelId: req.headers['x-goog-channel-id'],
    resourceId: req.headers['x-goog-resource-id']
  }

  for (let i = 0; i < 12; i++) {
    Context.log('SyncGoogle-debouncer calendar', payload.channelId)
    debouncer.calendar(payload.channelId, payload)
  }

  return res.status(200).end()

  /*
    curl -XPOST http://localhost:3078/webhook/google/calendars/bounce/test \
    -H 'x-goog-channel-id: 79f9ae02-bc3f-440e-a438-fcde101bae6b' \
    -H 'x-goog-channel-token: 7c9a6fb9-4e95-49a3-b44a-a9fe6a345e9a' \
    -H 'x-goog-channel-expiration: Mon, 13 Jan 2020 17:17:03 GMT' \
    -H 'x-goog-resource-state: exists' \
    -H 'x-goog-resource-id: _TTpBl_68SpxpmfZ1cnLA0az34Y' \
    -H 'x-goog-resource-uri: https://www.googleapis.com/calendar/v3/calendars/ro38nlt03gs1jee2kb5plvoj1c@group.calendar.google.com/events?maxResults=250&alt=json'
  */
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfiles))
  app.get('/users/self/google/:id', auth, brandAccess, am(getGoogleProfile))

  app.delete('/users/self/google/:id', auth, brandAccess, am(disconnect)) // Disconnect Button On Web-App

  app.post('/users/self/google/:id/sync', auth, brandAccess, am(forceSync)) // Sync now Button On Web-App
  app.get('/users/self/google/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))

  app.put('/emails/google/:gcid/messages/:mid', auth, brandAccess, am(updateReadStatus))
  app.put('/emails/google/:gcid/messages', auth, brandAccess, am(batchUpdateReadStatus))
  app.post('/emails/google/:gcid/trash', auth, brandAccess, am(batchTrash))

  app.get('/users/google/:gcid/calendars', auth, brandAccess, am(getRemoteGoogleCalendars))
  app.post('/users/google/:gcid/conf', auth, brandAccess, am(configureCaledars))

  app.get('/webhook/google/grant', am(grantAccess))

  app.all('/webhook/google/gmail', am(gmailHooksMid), am(gmailHooks))
  app.all('/webhook/google/gmail/bounce', am(gmailHooksMid), am(gmailHooksDebouncer))
  app.all('/webhook/google/gmail/bounce/test', am(gmailHooksDebouncerTest))

  app.all('/webhook/google/calendars', am(calendarHooksMid), am(calendarHooks))
  app.all('/webhook/google/calendars/bounce', am(calendarHooksMid), am(calendarHooksDebouncer))
  app.all('/webhook/google/calendars/bounce/test', am(calendarHooksDebouncerTest))
}

module.exports = router