const am = require('../utils/async_middleware.js')

const Brand             = require('../models/Brand')
const GoogleAuthLink    = require('../models/Google/auth_link')
const GoogleCredential  = require('../models/Google/credential')
const GoogleMessage     = require('../models/Google/message')
const GoogleSyncHistory = require('../models/Google/sync_history')

const { getGoogleClient }       = require('../models/Google/plugin/client.js')
const { bodyParser, getFields } = require('../models/Google/workers/gmail/common')



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

const requestGmailAccessTest = async function (req, res) {
  const redirect = 'http://localhost:3078/dashboard/contacts?letter&s=0'
  const url      = await GoogleAuthLink.requestGmailAccess('9fdcdf2a-8e0f-11e9-988e-0a95998482ac', '0237f9a8-8e0f-11e9-9a0e-0a95998482ac', req.body.scopes)

  return res.json({
    'code': 'OK',
    'data': {
      'url': url,
      'redirect': redirect,
      'type': 'google_auth_link'
    }
  })
}

const requestGmailAccess = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  /*
  req.body.scopes = [
    'contacts.readonly',
    'gmail.readonly'
  ]
  */
  const scopes = req.body.scopes || ['contacts.readonly']

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
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(credential)
}

const revokeAccess = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if (credential.revoked)
    return res.model(credential)

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  await GoogleCredential.updateAsRevoked(credential.id)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const disableEnableSync = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  let action = 'enable'

  if ( req.method.toLowerCase() === 'delete' )
    action = 'disable'

  await GoogleCredential.disableEnableSync(credential.id, action)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const getGCredentialLastSyncHistory = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const google_credential_id = req.params.id

  const history = await GoogleSyncHistory.getGCredentialLastSyncHistory(user, brand, google_credential_id)

  if ( history.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( history.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  return res.model(history)
}

const forceSync = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job finished.')

  if ( credential.revoked )
    throw Error.BadRequest('Your Google-Account is already revoked!')

  await GoogleCredential.forceSync(credential.id)

  const updated_credential = await GoogleCredential.get(credential.id)

  return res.model(updated_credential)
}

const batchGetMessages = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (req.body.messageIds.length === 0)
    return res.status(204).end()

  const credential = await GoogleCredential.get(req.params.id)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')


  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')


  // let counter = 1
  // const messageIdsMap = {}

  // for (const id of messageIds) {
  //   messageIdsMap[counter ++] = id
  // }

  const messages   = []
  const messageIds = req.body.messageIds.map(messageId => ({ 'id': messageId }))

  const fields = getFields(true)

  try {

    const result = await google.batchGetMessages(messageIds, fields)
    
    for ( const message of result ) {

      const { text, html } = bodyParser(message)

      messages.push({
        // status: message.status,
        // id: (message.body.id) ? message.body.id : messageIdsMap[Number(message.id)],
        // bodyPreview: (message.body.bodyPreview) ? message.body.bodyPreview : null,
        // uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : null,
        htmlBody: html || null,
        textBody: text || null,
        // error: (message.body.error.message) ? message.body.error.message : null
      })
    }

    return res.json(messages)
  
  } catch (ex) {

    console.log('---- batchGetMessages', ex)

    throw Error.BadRequest('batchGetMessages failed!')
  }
}

const downloadAttachment = async function (req, res) {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const gcid = req.params.gcid
  const mid  = req.params.mid
  const aid  = req.params.aid

  const credential = await GoogleCredential.get(gcid)

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')


  const googleMessage = await GoogleMessage.get(mid, credential.id)

  if (!googleMessage)
    throw Error.ResourceNotFound('Related Google-Message not found!')


  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client failed!')


  let targetAttachment = null

  for (const att of googleMessage.attachments) {
    if ( att.id === aid )
      targetAttachment = att
  }

  if (!targetAttachment)
    throw Error.ResourceNotFound('Google-Message-Attachment not found!')


  try {

    const attachment = await google.getAttachment(mid, aid)
  
    res.setHeader('Content-disposition', 'attachment; filename=' + targetAttachment.name)
    res.setHeader('Content-type', targetAttachment.contentTyp)

    const fileStream = new Buffer(attachment.data, 'base64')
    
    return res.send(200, fileStream)

  } catch (ex) {

    console.log('---- downloadAttachment', ex)

    throw Error.BadRequest('downloadAttachment failed!')
  }
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/self/google', auth, brandAccess, am(requestGmailAccess))
  app.get('/users/self/google', auth, brandAccess, am(getGoogleProfiles))
  app.get('/users/self/google/:id', auth, brandAccess, am(getGoogleProfile))

  app.delete('/users/self/google/:id', auth, brandAccess, am(revokeAccess))
  app.delete('/users/self/google/:id/sync', auth, brandAccess, am(disableEnableSync))
  app.put('/users/self/google/:id/sync', auth, brandAccess, am(disableEnableSync))

  app.get('/users/self/google/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))
  app.post('/users/self/google/:id/sync', auth, brandAccess, am(forceSync))
  app.post('/users/self/google/:id/messages', auth, brandAccess, am(batchGetMessages))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', auth, brandAccess, am(downloadAttachment))
  
  app.get('/webhook/google/grant', am(grantAccess))



  // test api
  app.post('/users/test/google', am(requestGmailAccessTest))
}

module.exports = router