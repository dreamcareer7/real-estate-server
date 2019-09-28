const am = require('../utils/async_middleware.js')

const Slack             = require('../models/Slack')
const Brand             = require('../models/Brand')
const GoogleAuthLink    = require('../models/Google/auth_link')
const GoogleCredential  = require('../models/Google/credential')
const GoogleMessage     = require('../models/Google/message')
const GoogleSyncHistory = require('../models/Google/sync_history')
const AttachedFile      = require('../models/AttachedFile')



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
    
    res.setHeader('Content-disposition', 'attachment; filename=' + attachmentObj.name)
    res.setHeader('Content-type', attachmentObj.contentType)

    return res.send(new Buffer(attachment.data, 'base64'))

  } catch (ex) {

    if( ex.statusCode === 404 )
      throw Error.ResourceNotFound('Google-Message-Attachment Not Found!')

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
    throw Error.Unauthorized('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.Unauthorized('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') )
    throw Error.Unauthorized('Access is denied! Insufficient Permission.')

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
  const brand = getCurrentBrand()
  const user  = req.user.id

  const credential = await GoogleCredential.get(req.params.gcid)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

  if (credential.revoked)
    throw Error.Unauthorized('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.Unauthorized('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') )
    throw Error.Unauthorized('Access is denied! Insufficient Permission.')

  if ( credential.user !== user )
    throw Error.Unauthorized('Invalid user credential.')

  if ( credential.brand !== brand )
    throw Error.Unauthorized('Invalid brand credential.')


  if (!req.body.subject)
    throw Error.BadRequest('Subject is not specified.')

  if (!req.body.to)
    throw Error.BadRequest('To is not specified.')

  if ( req.body.to.length === 0 )
    throw Error.BadRequest('To is not specified.')

  // if (!req.body.text)
  //   throw Error.BadRequest('Text-Body is not specified.')

  if (!req.body.html)
    throw Error.BadRequest('HTML-Body is not specified.')


  const params = {
    'credential': credential,

    'header': {
      'subject': req.body.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': req.body.to,
      'cc': req.body.cc || [],
      'bcc': req.body.bcc || []
      // 'In-Reply-To': ''
    },

    'threadId': req.body.threadId || null,

    'attachments': req.body.attachments || [],

    'body': {
      'text': req.body.text,
      'html': req.body.html
    }
  }

  try {
    // await GoogleMessage.sendEmail(params)

    const result = await GoogleMessage.sendEmail(params)
    console.log('----- result:', result)

    return res.status(202).end()

  } catch (ex) {

    Slack.send({ channel: '7-server-errors', text: `Gmail-Send-Message-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })
    Slack.send({ channel: '7-server-errors', text: `Gmail-Send-Message-Failed - credential: ${credential.id} - Ex: ${ex.message}`, emoji: ':skull:' })

    throw Error.BadRequest('Google-Send-Emails Failed!')
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
  const credential = await GoogleCredential.get(req.params.gcid)

  const params = {
    'credential': credential,

    'header': {
      'subject': req.body.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': req.body.to,
      'cc': req.body.cc || [],
      'bcc': req.body.bcc || []
    },

    'threadId': req.body.threadId || null,

    'attachments': req.body.attachments || [],

    'body': {
      'text': req.body.text,
      'html': req.body.html
    }
  }

  try {
    await GoogleMessage.sendEmail(params)
    return res.status(202).end()
  } catch (ex) {
    console.log(ex)
    throw Error.BadRequest('Google-Send-Email Failed!')
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
  // app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', auth, brandAccess, am(downloadAttachment))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid', am(downloadAttachment))
  app.post('/users/self/google/:gcid/attachments', auth, brandAccess, am(uploadAttachment))
  app.post('/users/self/google/:gcid/send', auth, brandAccess, am(sendEmail))

  app.get('/webhook/google/grant', am(grantAccess))



  // test api
  app.post('/users/self/auth/google/test', auth, brandAccess, am(requestGmailAccessTest))
  app.get('/users/self/google/:gcid/messages/:mid/attachments/:aid/test', am(downloadAttachmentTest))
  app.post('/users/self/google/:gcid/send/test', auth, brandAccess, am(sendEmailTest))

  /*
  curl -XPOST 'http://localhost:3078/users/self/auth/google/test' \
  -H 'Authorization: Bearer OWIwMjk0NjgtYzRkOC0xMWU5LThjMTgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac'


  curl -XPOST 'http://localhost:3078/users/self/google/89bf4a31-5b7a-4a60-9275-dc6a43cca358/send/test' \
  -H 'Authorization: Bearer OWIwMjk0NjgtYzRkOC0xMWU5LThjMTgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac' -H 'Content-Type: application/json' -d\
  '{
    "subject": "message-subject-by-curl ###xxx",
    "to": ["chavoshian.shiva@gmail.com"],
    "bcc": ["tmec@isdaq.com"],
    "cc": ["saeed@rechat.com"],
    "text": "text-body",
    "html": "<b><i>html-boddy</i></b>"
  }'


  curl -XPOST 'http://localhost:3078/users/self/google/89bf4a31-5b7a-4a60-9275-dc6a43cca358/send/test' \
  -H 'Authorization: Bearer OWIwMjk0NjgtYzRkOC0xMWU5LThjMTgtMDI3ZDMxYTFmN2Ew' \
  -H 'X-RECHAT-BRAND: c21d779a-a3f2-11e9-89a0-0a95998482ac' -H 'Content-Type: application/json' -d\
  '{
    "subject": "message-subject-by-curl ***",
    "to": ["chavoshian.shiva@gmail.com"],
    "cc": ["tmec@isdaq.com"],
    "bcc": ["saeed@rechat.com"],

    "threadId": "",

    "attachments": [
      {
        "filename": "filename.jpg",
        "link": "https://d2dzyv4cb7po1i.cloudfront.net/21c04d82-0e8d-11e8-b6c0-0ae785638eb4/081a6420-c4db-11e9-b74d-459d3759cce0.jpg",
        "type": "image/jpeg"
      },{
        "filename": "doc.pdf",
        "link": "https://file-examples.com/wp-content/uploads/2017/10/file-sample_150kB.pdf",
        "type": "application/pdf"
      },{
        "filename": "archive.zip",
        "link": "https://github.com/saeed-vayghan/Data-Structure/archive/master.zip",
        "type": "application/zip"
      }
    ],

    "text": "text-body",
    "html": "<b><i>html-boddy</i></b>"
  }'
  */
}

module.exports = router