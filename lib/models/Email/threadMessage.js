const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const MicrosoftCredential = require('../Microsoft/credential')
const GoogleCredential    = require('../Google/credential')

const { getGoogleClient }       = require('../Google/plugin/client.js')
const { bodyParser, getFields } = require('../Google/workers/gmail/common')
const { getMGraphClient }       = require('../Microsoft/plugin/client.js')


const ThreadMessage = {}


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



ThreadMessage.gmailBatchGetMessages = async function (googleMessageIds, googleCredentialId) {
  const credential = await GoogleCredential.get(googleCredentialId)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

  // if (credential.revoked)
  //   throw Error.BadRequest('Google-Credential Is Revoked!')

  // if (credential.deleted_at)
  //   throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.readonly') )
    throw Error.BadRequest('Access is denied! Insufficient Permission.')


  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')


  try {
    return await fetchGmailBody(google, googleMessageIds)

  } catch (ex) {

    throw Error.BadRequest('Google-BatchGetMessages Failed!')
  }
}

ThreadMessage.outlookBatchGetMessages = async function (microsoftMessageIds, microsoftCredentialId) {
  const credential = await MicrosoftCredential.get(microsoftCredentialId)

  if (!credential)
    throw Error.ResourceNotFound('Microsoft-Credential Not Found!')

  // if (credential.revoked)
  //   throw Error.BadRequest('Microsoft-Credential Is Revoked!')

  // if (credential.deleted_at)
  //   throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if ( !credential.scope.includes('Mail.Read') )
    throw Error.BadRequest('Access is denied! Insufficient Permission.')


  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client Failed!')


  try {
    return await fetchOutlookBody(microsoft, microsoftMessageIds)

  } catch (ex) {

    throw Error.BadRequest('Microsoft-BatchGetMessages Failed!')
  }
}

ThreadMessage.checkByThread = async (threadKey, user, brand) => {
  const messages = await db.select('email/threadMessage/check_by_thread', [threadKey])

  let authorized = true

  for (const message of messages) {
    if ( message.origin === 'outlook' ) {
      const credential = await MicrosoftCredential.get(message.owner)

      if ( credential.user !== user || credential.brand !== brand )
        authorized = false
    }

    if ( message.origin === 'gmail' ) {
      const credential = await GoogleCredential.get(message.owner)

      if ( credential.user !== user || credential.brand !== brand )
        authorized = false
    }
  }

  return authorized
}

ThreadMessage.getByThread = async (threadKey) => {
  const messages = await db.select('email/threadMessage/get_by_thread', [threadKey])

  if ( messages.length < 1)
    throw Error.ResourceNotFound(`Thread by key ${threadKey} not found`)

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
    gmailMessagesBody = await  ThreadMessage.gmailBatchGetMessages(googleMessageIds, googleCredentialId)

  if ( microsoftMessageIds.length > 0 )
    outlookMessagesBody = await  ThreadMessage.outlookBatchGetMessages(microsoftMessageIds, microsoftCredentialId)
  
  for (const message of messages) {
    let root = null

    if ( message.origin === 'gmail' ) {
      root = gmailMessagesBody[message.message_id]

      for (const attach of message.attachments) {
        attach.url = `users/self/google/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
      }
    }

    if ( message.origin === 'outlook' ) {
      root = outlookMessagesBody[message.message_id]

      for (const attach of message.attachments) {
        attach.url = `users/self/microsoft/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
      }
    }

    if (root) {
      message.snippet     = root['snippet'] || null
      message.unique_body = root['uniqueBody'] || null
      message.html_body   = root['htmlBody'] || null
      message.text_body   = root['textBody'] || null
    }
  }

  return messages
}


Orm.register('thread_message', 'ThreadMessage', ThreadMessage)

module.exports = ThreadMessage