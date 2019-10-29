const am = require('../utils/async_middleware.js')
const Context         = require('../models/Context')
const { cleanString } = require('../utils/integration/helper')

const Slack                = require('../models/Slack')
const Brand                = require('../models/Brand')
const MicrosoftAuthLink    = require('../models/Microsoft/auth_link')
const MicrosoftCredential  = require('../models/Microsoft/credential')
const MicrosoftMessage     = require('../models/Microsoft/message')
const MicrosoftSyncHistory = require('../models/Microsoft/sync_history')
const AttachedFile         = require('../models/AttachedFile')



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

const requestMicrosoftAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id

  if (req.body.scopes) {
    if ( !Array.isArray(req.body.scopes) )
      throw Error.BadRequest('Scopes should be an array.')
  }

  const scopes   = req.body.scopes || ['Contacts.Read', 'Mail.Read', 'Mail.Send'] // 'Mail.ReadWrite' is included into 'Mail.Send'
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  const url = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, scopes, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}

const grantAccess = async function (req, res) {
  if (req.query.error)
    return res.redirect('https://rechat.com/dashboard')

  if (!req.query.code)
    throw Error.BadRequest('Code is not specified.')

  if (!req.query.state)
    throw Error.BadRequest('State is not specified.')

  const { redirect } = await MicrosoftAuthLink.grantAccess(req.query)

  res.writeHead(302, { 'Location': redirect })
  res.end()
}

const getMicrosoftProfiles = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credentials = await MicrosoftCredential.getByUser(user, brand)

  return res.collection(credentials)
}

const getMicrosoftProfile = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.params.id)
    throw Error.BadRequest('Id is not specified.')

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  return res.model(credential)
}

const deleteAccount = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if (!credential)
    throw Error.BadRequest('You have not any connected account!')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await MicrosoftCredential.disableEnableSync(credential.id, 'disable')

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user  = req.user.id
  const brand = getCurrentBrand()

  const credential = await MicrosoftCredential.get(req.params.id)

  if (!credential)
    throw Error.BadRequest('You have not any connected account!')

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

  await MicrosoftCredential.disableEnableSync(credential.id, action)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await MicrosoftCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  if ( credential.revoked )
    throw Error.BadRequest('Your Microsoft-Account is already revoked!')

  await MicrosoftCredential.forceSync(credential.id)

  const updated_credential = await MicrosoftCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const microsoft_credential_id = req.params.id

  const history = await MicrosoftSyncHistory.getMCredentialLastSyncHistory(user, brand, microsoft_credential_id)

  if ( history.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( history.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  return res.model(history)
}

const downloadAttachment = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id
  
  const mcid = req.params.mcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  // const credential = await MicrosoftCredential.get(mcid)

  // if ( credential.user !== user )
  //   throw Error.Unauthorized('Invalid user credential.')

  // if ( credential.brand !== brand )
  //   throw Error.Unauthorized('Invalid brand credential.')

  try {
    const attachment = await MicrosoftMessage.downloadAttachment(mcid, mid, aid)
    
    // res.setHeader('Content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(cleanString(attachment.name))}`)
    res.setHeader('Content-disposition', `attachment; filename="${cleanString(attachment.name)}"`)
    res.setHeader('Content-type', attachment.contentType)

    return res.send(new Buffer(attachment.contentBytes, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 )
      throw Error.ResourceNotFound('Microsoft-Message-Attachment Not Found!')

    Context.log('Microsoft-Download-Attachment-Failed', ex)

    Slack.send({ channel: '7-server-errors', text: `Microsoft-Download-Attachment-Failed - credential: ${mcid} - Ex: ${ex.message}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `Microsoft-Download-Attachment-Failed - credential: ${mcid} - Ex: ${ex.message}`, emoji: ':skull:' })

    throw Error.BadRequest('Microsoft-Download-Attachment Failed!')
  }
}

const uploadAttachment = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await MicrosoftCredential.get(req.params.mcid)

  if (!credential)
    throw Error.ResourceNotFound('Microsoft-Credential Not Found!')

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if ( !credential.scope.includes('Mail.Send') && !credential.scope.includes('Mail.ReadWrite') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

  const path = `${req.user.id}/outlook_attachments/${credential.id}`

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

    if (file.mime === 'image/bmp')
      throw Error.BadRequest('BMP files are not allowed!')

    res.model(file)
  })
}

const sendEmail = async function (req, res) {
  /* Limits
    10,000 recipients per day
    500 recipients
  */

  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await MicrosoftCredential.get(req.params.mcid)

  if (!credential)
    throw Error.ResourceNotFound('Microsoft-Credential Not Found!')

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if ( !credential.scope.includes('Mail.Send') && !credential.scope.includes('Mail.ReadWrite') )
    throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')

    
  const toRecipients  = req.body.to || []
  const ccRecipients  = req.body.cc || []
  const bccRecipients = req.body.bcc || []

  if ( toRecipients.length === 0 )
    throw Error.BadRequest('To is not specified.')

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 500 )
    throw Error.BadRequest('Recipients number should not be greater than 500.')

  if (!req.body.html)
    throw Error.BadRequest('HTML-Body is not specified.')


  let isReply = false

  if ( req.body.messageId ) {
    // If this is a reply to a thread, subject should not be altered
    // Adding "Re: " to the head of the subject is allowed

    isReply = true

    const replyToMessage = await MicrosoftMessage.get(req.body.messageId, credential.id)
    if ( !replyToMessage )
      throw Error.ResourceNotFound(`Microsoft-Message ${req.body.messageId} Not Found!`)
  }

  const params = {
    'messageId': req.body.messageId,
    'credential': credential,

    'header': {
      'subject': req.body.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients
    },

    'attachments': req.body.attachments || [],

    'body': {
      'text': req.body.text,
      'html': req.body.html
    }
  }

  let internetMessageId

  try {

    Context.log('Outlook-SendEmail --> Here 1 isReply', isReply)

    if (isReply) {
      internetMessageId = await MicrosoftMessage.sendReply(params)    
    } else {
      // await MicrosoftMessage.sendEmail(params)
      internetMessageId = await MicrosoftMessage.createAndSendMessage(params)
    }

    try {

      const sentMessage = await MicrosoftMessage.getRemoteMessage(credential, internetMessageId)
      return res.model(sentMessage)

    } catch (ex) {

      Context.log('Outlook-Send-Email Fetch-Remote-Message-Failed Ex:', ex)

      Slack.send({ channel: '7-server-errors', text: `Outlook-Send-Email Fetch-Remote-Message-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })
      Slack.send({ channel: 'integration_logs', text: `Outlook-Send-Email Fetch-Remote-Message-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })

      return res.status(204)
    }

  } catch (ex) {

    await MicrosoftCredential.forceSync(credential.id)

    Context.log('Outlook-Send-Email-Failed', ex)

    Slack.send({ channel: '7-server-errors', text: `Outlook-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message} - internetMessageId: ${internetMessageId}`, emoji: ':skull:' })
    Slack.send({ channel: 'integration_logs', text: `Outlook-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message} - internetMessageId: ${internetMessageId}`, emoji: ':skull:' })

    throw Error.BadRequest('Outlook-Send-Email Failed!')
  }
}


const requestMicrosoftAccessTest = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const scopes   = req.body.scopes || ['Contacts.Read', 'Mail.Read', 'Mail.Send']
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'

  const url = await MicrosoftAuthLink.requestMicrosoftAccess(user, brand, scopes, redirect)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'microsoft_auth_link'
    }
  })
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  app.delete('/users/self/microsoft/:id', auth, brandAccess, am(deleteAccount)) // Delete Button On Web-App

  app.delete('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet
  app.put('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync)) // Did not use by Client yet

  app.post('/users/self/microsoft/:id/sync', auth, brandAccess, am(forceSync))
  app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))

  app.get('/users/self/microsoft/:mcid/messages/:mid/attachments/:aid', am(downloadAttachment)) // old route
  app.post('/users/self/microsoft/:mcid/attachments', auth, brandAccess, am(uploadAttachment)) // old route

  app.get('/emails/microsoft/:mcid/messages/:mid/attachments/:aid', am(downloadAttachment))
  app.post('/emails/microsoft/:mcid/attachments', auth, brandAccess, am(uploadAttachment))

  app.post('/users/self/microsoft/:mcid/send', auth, brandAccess, am(sendEmail)) // old routes
  app.post('/emails/microsoft/:mcid/send', auth, brandAccess, am(sendEmail))

  app.get('/webhook/microsoft/grant', am(grantAccess))


  // test api
  app.post('/users/self/auth/microsoft/test', auth, brandAccess, am(requestMicrosoftAccessTest))

  /*
  curl -XPOST 'http://localhost:3078/users/self/auth/microsoft/test' \
  -H 'Authorization: Bearer OWIwMjk0NjgtYzRkOC0xMWU5LThjMTgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac'
  */
}

module.exports = router