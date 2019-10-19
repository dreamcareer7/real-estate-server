const am = require('../utils/async_middleware.js')
const Context         = require('../models/Context')
const { cleanString } = require('../utils/integration/helper')

const Slack                = require('../models/Slack')
const Brand                = require('../models/Brand')
const GoogleAuthLink       = require('../models/Google/auth_link')
const GoogleCredential     = require('../models/Google/credential')
const GoogleMessage        = require('../models/Google/message')
const GoogleSyncHistory    = require('../models/Google/sync_history')
const AttachedFile         = require('../models/AttachedFile')
const GoogleCalendar       = require('../models/Google/calendar')
// const GoogleCalendarEvents = require('../models/Google/calendar_events')



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

const requestGmailAccess = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (req.body.scopes) {
    if ( !Array.isArray(req.body.scopes) )
      throw Error.BadRequest('Scopes should be an array.')
  }

  const scopes   = req.body.scopes || ['contacts.readonly', 'gmail.readonly', 'gmail.send'] // 'contacts.readonly', 'gmail.readonly', 'gmail.send', 'calendar'
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

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

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

    Context.log('Gmail-Download-Attachment-Failed', ex)

    Slack.send({ channel: '7-server-errors', text: `Gmail-Download-Attachment-Failed - credential: ${gcid} - Ex: ${ex.message}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `Gmail-Download-Attachment-Failed - credential: ${gcid} - Ex: ${ex.message}`, emoji: ':skull:' })

    throw Error.BadRequest('Google-DownloadAttachment Failed!')
  }
}

const uploadAttachment = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.gcid)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  const path = `${req.user.id}/gmail_attachments/${credential.id}`

  AttachedFile.saveFromRequest({
    path: path,
    req,
    relations: [
      {
        role: 'User',
        role_id: req.user.id
      }
    ],
    public: false
  }, function(err, {file}) {
    if(err)
      return res.error(err)

    res.model(file)
  })
}

const sendEmail = async function (req, res) {
  /* Limits
    10,000 recipients per day
    100 recipients
  */

  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.gcid)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')


  const toRecipients  = req.body.to || []
  const ccRecipients  = req.body.cc || []
  const bccRecipients = req.body.bcc || []

  if ( req.body.to.length === 0 )
    throw Error.BadRequest('To is not specified.')

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 100 )
    throw Error.BadRequest('Recipients number should not be greater than 100.')

  // if (!req.body.text)
  //   throw Error.BadRequest('Text-Body is not specified.')

  if (!req.body.html)
    throw Error.BadRequest('HTML-Body is not specified.')


  const params = {
    'credential': credential,

    'header': {
      'subject': req.body.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients,
      'In-Reply-To': `<${req.body.inReplyTo}>` || null
    },

    'threadId': req.body.threadId || null,

    'attachments': req.body.attachments || [],

    'body': {
      'text': req.body.text,
      'html': req.body.html
    }
  }

  try {

    /*
      result: {
        id: '16d79b49e3e966c9',
        threadId: '16d76e86ef290ee6',
        labelIds: [ 'SENT' ]
      }
    */
    const result = await GoogleMessage.sendEmail(params)

    const sentMessageId = result.id
    const sentMessage   = await GoogleMessage.getRemoteMessage(credential, sentMessageId)

    return res.model(sentMessage)

  } catch (ex) {

    Context.log('Gmail-Send-Email-Failed', ex)

    Slack.send({ channel: '7-server-errors', text: `Gmail-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `Gmail-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })

    throw Error.BadRequest('Google-Send-Email Failed!')
  }
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

const downloadAttachmentTest = async function (req, res) {
  const gcid = req.params.gcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  try {
    const { attachmentObj, attachment } = await GoogleMessage.downloadAttachment(gcid, mid, aid)
    
    res.setHeader('Content-disposition', 'attachment; filename=' + attachmentObj.name)
    res.setHeader('Content-type', attachmentObj.contentType)

    return res.send(new Buffer(attachment.data, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 )
      throw Error.ResourceNotFound('Google-Message-Attachment Not Found!')

    throw Error.BadRequest('Google-DownloadAttachment Failed!')
  }
}

const testCalendar = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  const googleCredentialId = req.params.gcid

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
  // const createdCalendar   = await GoogleCalendar.get(googleCredentialId, createdCalendarId)

  // const updatedCalendarId = await GoogleCalendar.update(googleCredentialId, createdCalendar.id, updateCalendarBody)
  // const updatedCalendar   = await GoogleCalendar.get(googleCredentialId, updatedCalendarId)

  

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



  const eventsObj = await GoogleCalendar.listEvents(googleCredentialId)
  for (const event of eventsObj.items) {
    console.log('Updated:', event.updated, 'Created:', event.created, event.status)
    console.log('start:', event.start, '\n\n')
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
  // app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', auth, brandAccess, am(downloadAttachment))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', am(downloadAttachment))
  app.post('/users/self/google/:gcid/attachments', auth, brandAccess, am(uploadAttachment))
  app.post('/users/self/google/:gcid/send', auth, brandAccess, am(sendEmail))

  app.get('/webhook/google/grant', am(grantAccess))



  // test api
  app.post('/users/self/auth/google/test', auth, brandAccess, am(requestGmailAccessTest))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid/test', am(downloadAttachmentTest))
  app.get('/users/self/google/calendar/:gcid/test', auth, brandAccess, am(testCalendar))

  /*
  curl -XPOST 'http://localhost:3078/users/self/auth/google/test' \
  -H 'Authorization: Bearer ODlhZWI3MzItZWIyNS0xMWU5LTk5MmYtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: 6486e1b6-3395-11e9-a0e9-0a95998482ac'

  curl -XGET 'http://localhost:3078/users/self/google/calendar/c19456fd-4bdb-45c9-91ca-fe1aaae2e3ad/test' \
  -H 'Authorization: Bearer Mzk5ZDIyNTQtZWViZi0xMWU5LWJhOTAtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: e650a68e-e522-11e9-98e5-027d31a1f7a0'
  */
}

module.exports = router