const am = require('../utils/async_middleware.js')

const Brand                = require('../models/Brand')
const EmailIntegration     = require('../models/Email/integration')
const MicrosoftCredential  = require('../models/Microsoft/credential')
const GoogleCredential     = require('../models/Google/credential')

const { getGoogleClient }       = require('../models/Google/plugin/client.js')
const { bodyParser, getFields } = require('../models/Google/workers/gmail/common')
const { getMGraphClient }       = require('../models/Microsoft/plugin/client.js')



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

const fetchGmailBody = async function (google, googleMessageIds) {
  const messages      = {}
  const messageIdsMap = {}
  const messageIds    = googleMessageIds.map(messageId => ({ 'id': messageId }))

  let counter = 1

  for (const id of messageIds) {
    messageIdsMap[counter ++] = id
  }

  const result = await google.batchGetMessages(messageIds, getFields(true))

  counter = 0
  for ( const message of result ) {
    counter ++
    const msg = {}

    if ( message.payload ) {
      const { snippet, text, html } = bodyParser(message)

      msg.status      = 200
      msg.id          = message.id
      msg.snippet     = snippet
      msg.uniqueBody  = null
      msg.htmlBody    = html || null
      msg.textBody    = text || null
      msg.error       = null

    } else {

      msg.status      = message.error.code
      msg.id          = messageIdsMap[counter]
      msg.snippet     = null
      msg.uniqueBody  = null
      msg.htmlBody    = null
      msg.textBody    = null
      msg.error       = message.error.message
    }

    messages[msg.id] = msg
  }

  return messages
}

const gmailBatchGetMessages = async function (googleMessageIds, googleCredentialId) {
  const credential = await GoogleCredential.get(googleCredentialId)
  const google     = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  try {
    return await fetchGmailBody(google, googleMessageIds)

  } catch (ex) {

    throw Error.BadRequest('Google-BatchGetMessages Failed!')
  }
}

const fetchOutlookBody = async function (microsoft, microsoftMessageIds) {
  const messages      = {}
  const messageIdsMap = {}

  let counter = 1

  for (const id of microsoftMessageIds) {
    messageIdsMap[counter ++] = id
  }

  do {
    const temp   = microsoftMessageIds.splice(0,20)
    const result = await microsoft.batchGetMessagesNative(temp)
  
    for (const message of result.responses) {
      const id = (message.body.id) ? message.body.id : messageIdsMap[Number(message.id)]

      messages[id] = {
        status: message.status,
        id: id,
        snippet: (message.body.bodyPreview) ? message.body.bodyPreview : null,
        uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : null,
        htmlBody: (message.body.body) ? message.body.body.content : null,
        textBody: null,
        error: (message.body.error) ? ((message.body.error.message) ? message.body.error.message : null) : null,
      }
    }

  } while ( microsoftMessageIds.length > 0 )

  return messages  
}

const outlookBatchGetMessages = async function (microsoftMessageIds, microsoftCredentialId) {
  const credential = await MicrosoftCredential.get(microsoftCredentialId)
  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client Failed!')
  
  try {
    return await fetchOutlookBody(microsoft, microsoftMessageIds)

  } catch (ex) {

    throw Error.BadRequest('Microsoft-BatchGetMessages Failed!')
  }
}


const getThread = async function (req, res) {
}

const getThreadTest = async function (req, res) {
  const messages = await EmailIntegration.getByThread(req.params.tk)

  const googleMessageIds    = []
  const microsoftMessageIds = []

  let googleCredentialId    = null
  let microsoftCredentialId = null

  let gmailMessagesBody   = {}
  let outlookMessagesBody = {}

  for (const message of messages) {
    if ( message.origin === 'gmail' ) {
      googleMessageIds.push(message.message_id)

      if(!googleCredentialId)
        googleCredentialId = message.owner
    }

    if ( message.origin === 'outlook' ) {
      microsoftMessageIds.push(message.message_id)

      if(!microsoftCredentialId)
        microsoftCredentialId = message.owner
    }
  }

  if ( googleMessageIds.length > 0 )
    gmailMessagesBody = await  gmailBatchGetMessages(googleMessageIds, googleCredentialId)

  if ( microsoftMessageIds.length > 0 )
    outlookMessagesBody = await  outlookBatchGetMessages(microsoftMessageIds, microsoftCredentialId)
  
  for (const message of messages) {
    let root = null

    if ( message.origin === 'gmail' )
      root = gmailMessagesBody[message.message_id]

    if ( message.origin === 'outlook' )
      root = outlookMessagesBody[message.message_id]

    if (root) {
      message.snippet     = root['snippet'] || null
      message.unique_body = root['uniqueBody'] || null
      message.html_body   = root['htmlBody'] || null
      message.text_body   = root['textBody'] || null
    }
  }

  return res.json(messages)
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/integration/thread/:tk', auth, brandAccess, am(getThread))

  /*
    curl -XGET http://localhost:3078/emails/integration/thread/89bf4a31-5b7a-4a60-9275-dc6a43cca35816c8ca2e186d3606/test \
    -H 'Authorization: Bearer MjhjZTExYzItYmY1OC0xMWU5LThkN2ItMTY2M2JiMWI5MGYw' \
    -H 'X-RECHAT-BRAND: 7b12b516-2a23-11e9-ad24-0a95998482ac'
  */
  app.get('/emails/integration/thread/:tk/test', am(getThreadTest))
}

module.exports = router