const am = require('../utils/async_middleware.js')
const Context         = require('../models/Context')
const { cleanString } = require('../utils/integration/helper')

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

  Slack.send({ channel: '7-server-errors',  text: text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: text, emoji: ':skull:' })
}


const requestGmailAccess = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (req.body.scopes) {
    if ( !Array.isArray(req.body.scopes) )
      throw Error.BadRequest('Scopes should be an array.')
  }

  const scopes   = req.body.scopes || ['contacts.readonly'] // 'contacts.readonly', 'gmail.readonly', 'gmail.send', 'calendar' ('gmail.modify' is included into 'gmail.send')
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

  // const closeDialog = fs.readFileSync(__dirname + '/../html/google/close_dialog.html').toString()
  // res.header('Content-Type', 'text/html')
  // res.write(closeDialog)
  // res.end()

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

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  return res.model(credential)
}

const deleteAccount = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

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

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

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

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

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

  if ( history.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( history.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  return res.model(history)
}

const downloadAttachment = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  const gcid = req.params.gcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  // const credential = await GoogleCredential.get(gcid)

  // if ( credential.user !== user )
  //   throw Error.Unauthorized('Invalid user credential.')

  // if ( credential.brand !== brand )
  //   throw Error.Unauthorized('Invalid brand credential.')

  try {
    const { attachmentObj, attachment } = await GoogleMessage.downloadAttachment(gcid, mid, aid)
    
    // res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(cleanString(attachmentObj.name))}`)
    res.setHeader('Content-disposition', `attachment; filename="${cleanString(attachmentObj.name)}"`)
    res.setHeader('Content-type', attachmentObj.contentType)

    return res.send(new Buffer(attachment.data, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 || ex.http === 404 )
      throw Error.ResourceNotFound('Google-Message-Attachment Not Found!')

    const text = `Gmail-Download-Attachment-Failed - credential: ${gcid} - Ex: ${ex.message}`
    const msg  = `Gmail-Download-Attachment-Failed Ex: ${ex}`
    sendSlackMessage(text, msg)

    throw Error.BadRequest('Google-DownloadAttachment Failed!')
  }
}

const updateReadStatus = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const messageId  = req.params.mid
  const credential = await GoogleCredential.get(req.params.gcid)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  if ( credential.deleted_at )
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Your Google-Account is already revoked!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.modify') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')

  try {

    await GoogleMessage.updateReadStatus(credential, messageId, Boolean(req.body.status))

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

  if(!req.params.gcid)
    throw Error.BadRequest('Google-Credential-Id is not specified.')

  const credential = await GoogleCredential.get(req.params.gcid)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  const { readWrite, readOnly } = await GoogleCalendar.getRemoteGoogleCalendars(req.params.gcid)

  const response = {
    readWrite: readWrite,
    readOnly: readOnly
  }

  return res.model(response)
}

const configureCaledars = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if(!req.params.gcid)
    throw Error.BadRequest('Google-Credential-Id is not specified.')

  const credential = await GoogleCredential.get(req.params.gcid)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  const validTypes = ['new', 'old']

  if ( !validTypes.includes(req.body.rechatCalendar.type) )
    throw Error.BadRequest('Bad Rechat-Calendar Type!')

  if ( req.body.rechatCalendar.type === 'old' ) {
    if ( !req.body.rechatCalendar.id )
      throw Error.BadRequest('Bad Rechat-Calendar Id!')
  }

  if ( req.body.rechatCalendar.type === 'new' ) {
    if ( !req.body.rechatCalendar.body.summary )
      throw Error.BadRequest('Bad Rechat-Calendar Summary!')
  }

  await GoogleCalendar.configureCaledars(req.params.gcid, req.body)

  return res.status(204).end()
}

const caledarHooks = async function (req, res) {
  Context.log('Google-Calendar-Web-Hooks', 'Body:', JSON.stringify(req.body), 'Headers:', JSON.stringify(req.headers))

  return res.status(200).end()
}

const requestGmailAccessTest = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const scopes   = req.body.scopes || ['contacts.readonly', 'gmail.readonly', 'gmail.send', 'calendar']
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'

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

const testCalendar = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  // const googleCredentialId = req.params.gcid

  // const createCalendarBody = {
  //   summary: 'summary',
  //   description: 'description',
  //   location: 'Montreal',
  //   timeZone: 'America/Chicago'
  // }

  // const updateCalendarBody = {
  //   summary: 'summary-xxx',
  //   description: 'description-xxx',
  //   location: 'Tehran',
  //   timeZone: 'America/Chicago'
  // }

  // const createdCalendarId = await GoogleCalendar.create(googleCredentialId, createCalendarBody)
  // const createdCalendar   = await GoogleCalendar.get(createdCalendarId)

  // const updatedCalendarId = await GoogleCalendar.update(googleCredentialId, updateCalendarBody)
  // const updatedCalendar   = await GoogleCalendar.get(updatedCalendarId)

  

  // const initial = {
  //   rechatCalendar: {
  //     type: 'old',
  //     id: 'my_custom_cal',
  //   },
  //   toSync: ['a6f3jngd8qgqh2jg7b4vgtr08s@group.calendar.google.com', 'heshmat.zapata@gmail.com']
  // }

  // const initial_2 = {
  //   rechatCalendar: {
  //     type: 'new',
  //     body: {
  //       summary: 'summary',
  //       description: 'description',
  //       location: 'Montreal',
  //       timeZone: 'America/Chicago'
  //     }
  //   },
  //   toSync: ['a6f3jngd8qgqh2jg7b4vgtr08s@group.calendar.google.com', 'heshmat.zapata@gmail.com']
  // }

  // await GoogleCalendar.configureCaledars(googleCredentialId, initial)



  // const eventsObj = await GoogleCalendar.listEvents(googleCredentialId)
  // for (const event of eventsObj.items) {
  //   console.log('Updated:', event.updated, 'Created:', event.created, event.status)
  //   console.log('start:', event.start, '\n\n')
  // }

  return res.json({})
}

const testWatcher = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  const googleCredentialId = req.params.gcid

  await GoogleCalendar.watch(googleCredentialId, '3902b4d5-a15d-433f-8320-059737c48fe7')

  return res.json({})
}

const testStopWatcher = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  const googleCredentialId = req.params.gcid

  await GoogleCalendar.stopWatch(googleCredentialId, '3902b4d5-a15d-433f-8320-059737c48fe7')

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

  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', am(downloadAttachment)) // old route
  app.get('/emails/google/:gcid/messages/:mid/attachments/:aid', am(downloadAttachment))

  app.put('/emails/google/:gcid/messages/:mid', auth, brandAccess, am(updateReadStatus))

  app.get('/users/google/:gcid/calendars', auth, brandAccess, am(getRemoteGoogleCalendars))
  app.post('/users/google/:gcid/conf', auth, brandAccess, am(configureCaledars))

  app.get('/webhook/google/grant', am(grantAccess))
  app.all('/webhook/google/calendar', am(caledarHooks))

  // test api
  app.post('/users/self/auth/google/test', auth, brandAccess, am(requestGmailAccessTest))
  app.get('/users/self/google/calendar/:gcid/test', auth, brandAccess, am(testCalendar))
  app.post('/users/google/:gcid/watch/test', auth, brandAccess, am(testWatcher))
  app.delete('/users/google/:gcid/watch/test', auth, brandAccess, am(testStopWatcher))

  /*
  curl -XPOST 'http://localhost:3078/users/self/auth/google/test' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0'

  curl -XGET 'http://localhost:3078/users/self/google/calendar/7a17812c-3c82-4717-b8b5-994cab4ebbe8/test' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0'


  // getRemoteGoogleCalendars
  curl -XGET 'http://localhost:3078/users/google/7a17812c-3c82-4717-b8b5-994cab4ebbe8/calendars' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0'

  // configureCaledars - new
  curl -XPOST 'http://localhost:3078/users/google/7a17812c-3c82-4717-b8b5-994cab4ebbe8/conf' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0' \
  -H 'content-type: application/json' \
  -d '{
    "rechatCalendar": {
      "type": "new",
      "body": {
        "summary": "rechat-cal-summary",
        "description": "rechat-cal-description",
        "location": "Chicago",
        "timeZone": "America/Chicago"
      }
    },
    "toSync": ["jqq8b51h0rfdujo4ofted56uqc@group.calendar.google.com", "heshmat.zapata@gmail.com"]
  }'

  // configureCaledars - old
  curl -XPOST 'http://localhost:3078/users/google/7a17812c-3c82-4717-b8b5-994cab4ebbe8/conf' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0' \
  -H 'content-type: application/json' \
  -d '{
    "rechatCalendar": {
      "type": "old",
      "id": "heshmat.zapata@gmail.com"
    },
    "toSync": ["jqq8b51h0rfdujo4ofted56uqc@group.calendar.google.com", "heshmat.zapata@gmail.com"]
  }'

  // testWatcher
  curl -XPOST 'http://localhost:3078/users/google/7a17812c-3c82-4717-b8b5-994cab4ebbe8/watch/test' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0'

  // testStopWatcher
  curl -XDELETE 'http://localhost:3078/users/google/7a17812c-3c82-4717-b8b5-994cab4ebbe8/watch/test' \
  -H 'Authorization: Bearer Njc5MjRkNTQtZjFjOC0xMWU5LTg5MDgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: a0454440-be05-11e9-9b6e-1663bb1b90f0'
  */
}

module.exports = router