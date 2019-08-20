const am = require('../utils/async_middleware.js')

const Brand             = require('../models/Brand')
const GoogleAuthLink    = require('../models/Google/auth_link')
const GoogleCredential  = require('../models/Google/credential')
const GoogleMessage     = require('../models/Google/message')
const GoogleSyncHistory = require('../models/Google/sync_history')



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
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const redirect = req.body.redirect || 'https://rechat.com/dashboard/contacts/'

  /*
  req.body.scopes = [
    'contacts.readonly',
    'gmail.readonly',
    'gmail.send'
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

const deleteAccount = async function (req, res) {
  const user = req.user.id
  const brand = getCurrentBrand()

  const credential = await GoogleCredential.get(req.params.id)

  if (!credential)
    throw Error.BadRequest('You have not any connected account!')

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

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
    throw Error.BadRequest('You have not any connected account!')

  if ( credential.user !== user )
    throw Error.BadRequest('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.BadRequest('Invalid brand credential.')

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


const requestGmailAccessTest = async function (req, res) {
  const brand    = getCurrentBrand()
  const user     = req.user.id
  const scopes   = req.body.scopes || ['contacts.readonly', 'gmail.readonly', 'gmail.send']
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

const sendEmailTest = async function (req, res) {
  const gcid = req.params.gcid
  const tid  = '16c8ca2e186d3606'

  try {
    const result = await GoogleMessage.sendEmail(gcid, tid)
    
    return res.json(result)

  } catch (ex) {

    console.log(ex)

    // console.log('\n\n************ sendEmailTest Ex:')
    // console.log('message:', ex.message)
    // console.log('statusCode:', ex.statusCode)
    // console.log('error:', ex.error)
    // console.log('Error:', ex.Error)

    // delete ex.response.config.data.raw
    // delete ex.response.config.body
    // console.log('response:', ex.response)

    throw Error.BadRequest('Google-Send-Emails Failed!')
  }
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
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', auth, brandAccess, am(downloadAttachment))
  
  app.get('/webhook/google/grant', am(grantAccess))



  // test api
  app.post('/users/self/auth/google/test', auth, brandAccess, am(requestGmailAccessTest))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid/test', auth, brandAccess, am(downloadAttachmentTest))


  /*
  curl -XPOST 'http://localhost:3078/users/self/auth/google/test' \
  -H 'Authorization: Bearer MjhjZTExYzItYmY1OC0xMWU5LThkN2ItMTY2M2JiMWI5MGYw' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac'


  curl -XPOST 'http://localhost:3078/users/self/google/89bf4a31-5b7a-4a60-9275-dc6a43cca358/send/test' \
  -H 'Authorization: Bearer MjhjZTExYzItYmY1OC0xMWU5LThkN2ItMTY2M2JiMWI5MGYw' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac'
  */
  app.post('/users/self/google/:gcid/send/test', auth, brandAccess, am(sendEmailTest))
}

module.exports = router