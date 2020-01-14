const am = require('../utils/async_middleware.js')
const Context = require('../models/Context')

const Slack             = require('../models/Slack')
const Brand             = require('../models/Brand')
const GoogleAuthLink    = require('../models/Google/auth_link')
const GoogleCredential  = require('../models/Google/credential')
const GoogleMessage     = require('../models/Google/message')
const GoogleSyncHistory = require('../models/Google/sync_history')
const GoogleCalendar    = require('../models/Google/calendar')


function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

function sendSlackMessage(text, ex) {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })
}

function checkCredentialUser(credential, user, brand) {
  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')
}


const requestGmailAccess = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (req.body.scopes) {
    if ( !Array.isArray(req.body.scopes) )
      throw Error.BadRequest('Scopes should be an array.')
  }

  // const scopes = req.body.scopes || ['contacts.readonly'] // 'contacts.readonly', 'gmail.readonly', 'gmail.send', 'calendar' ('gmail.modify' is included into 'gmail.send')
  const scopes   = ['contacts.readonly', 'gmail.readonly', 'gmail.send', 'calendar']
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

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
  if(req.query.error === 'access_denied')
    return res.redirect('https://rechat.com/dashboard')

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

const deleteAccount = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await GoogleCredential.disableEnableSync(credential.id, 'disable')

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  let action = 'enable'

  if ( req.method.toLowerCase() === 'delete' )
    action = 'disable'

  await GoogleCredential.disableEnableSync(credential.id, action)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.id)

  checkCredentialUser(credential, user, brand)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  if ( credential.deleted_at )
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Your Google-Account is already revoked!')

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

  checkCredentialUser(credential, user, brand)

  if ( credential.deleted_at )
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Your Google-Account is already revoked!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.modify') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')

  try {

    await GoogleMessage.updateReadStatus(credential.id, messageId, Boolean(req.body.status))

  } catch (ex) {

    const text = `Gmail-Update-Read-Status-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Gmail-Update-Read-Status-Failed Ex: ${ex}`
    sendSlackMessage(text, msg)
  }

  return res.status(202).end()
}

const getRemoteGoogleCalendars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid)
    throw Error.BadRequest('Google-Credential-Id is not specified.')

  const credential = await GoogleCredential.get(gcid)

  checkCredentialUser(credential, user, brand)

  const response = await GoogleCalendar.getRemoteGoogleCalendars(credential)

  return res.model(response)
}

const configureCaledars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id
  const gcid  = req.params.gcid

  if(!gcid)
    throw Error.BadRequest('Google-Credential-Id is not specified.')

  const credential = await GoogleCredential.get(gcid)

  checkCredentialUser(credential, user, brand)

  const temp       = req.body.toSync || []
  const toStopSync = req.body.toStopSync || []

  const toSync = temp.filter(c => { if (!toStopSync.includes(c)) return true })

  const length = toSync.length + toStopSync.length

  if ( length === 0 )
    return res.status(204).end()

  await GoogleCalendar.configureCaledars(credential, { toSync, toStopSync })

  return res.status(204).end()
}

const calendarHooks = async function (req, res) {
  Context.log('SyncGoogle - Calendar Hooks - headers', req.headers)

  const state = req.headers['x-goog-resource-state']

  if ( state.toLowerCase() === 'sync' )
    return res.status(200).end()  

  // 'x-goog-channel-id': '2f0ea26a-6785-4b2f-b285-ece37e391b93',
  // 'x-goog-channel-token': '3bcb93c5-c5f0-4db5-947b-239074550dd2',
  // 'x-goog-channel-expiration': 'Mon, 13 Jan 2020 17:17:03 GMT',
  // 'x-goog-resource-state': 'exists',
  // 'x-goog-resource-id': 'SuelP1-rnXotZ_B6hLvI70BRFPo',
  // 'x-goog-resource-uri': 'https://www.googleapis.com/calendar/v3/calendars/heshmat.zapata@gmail.com/events?maxResults=250&alt=json',

  // const channelId  = req.headers['x-goog-channel-id'] // calendar.watcher_channel_id
  // const calendarId = req.headers['x-goog-channel-token'] // calendar.id

  // try {
  //   await GoogleCalendar.syncCalendar(channelId, calendarId)
  // } catch (ex) {
  //   Slack.send({ channel: '7-server-errors',  text: `Google-Calendar-Hook-Failed - ChannelId: ${channelId} - CalendarId: ${calendarId} - Detail: ${ex.message}`, emoji: ':skull:' })
  //   Slack.send({ channel: 'integration_logs', text: `Google-Calendar-Hook-Failed - ChannelId: ${channelId} - CalendarId: ${calendarId} - Detail: ${ex.message}`, emoji: ':skull:' })
  // }

  return res.status(200).end()
}


const testWatcher = async function (req, res) {
  try {
    const calendar = await GoogleCalendar.get(req.params.calid)
    await GoogleCalendar.watch(calendar)
  } catch (ex) {
    Context.log(ex)
  }
  return res.json({})
}

const testStopWatcher = async function (req, res) {
  try {
    // ex.message => Channel 'e19701b0-f738-11e9-b958-6b18bf54a387' not found for project '453194321487'
    const calendar = await GoogleCalendar.get(req.params.calid)
    await GoogleCalendar.stopWatch(calendar)
  } catch (ex) {
    Context.log(ex)
  }
  return res.json({})
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfiles))
  app.get('/users/self/google/:id', auth, brandAccess, am(getGoogleProfile))

  app.delete('/users/self/google/:id', auth, brandAccess, am(deleteAccount)) // Delete Button On Web-App

  app.delete('/users/self/google/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet
  app.put('/users/self/google/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet

  app.post('/users/self/google/:id/sync', auth, brandAccess, am(forceSync))
  app.get('/users/self/google/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))

  app.put('/emails/google/:gcid/messages/:mid', auth, brandAccess, am(updateReadStatus))

  app.get('/users/google/:gcid/calendars', auth, brandAccess, am(getRemoteGoogleCalendars))
  app.post('/users/google/:gcid/conf', auth, brandAccess, am(configureCaledars))

  app.get('/webhook/google/grant', am(grantAccess))
  app.all('/webhook/google/calendars', am(calendarHooks))


  /**  Testing APIs  **/
  app.post('/users/google/calendars/:calid/watch/test', am(testWatcher))
  app.delete('/users/google/calendars/:calid/watch/test', am(testStopWatcher))
}

module.exports = router
