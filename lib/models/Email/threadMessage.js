const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const Context = require('../Context')

const MicrosoftCredential = require('../Microsoft/credential')
const GoogleCredential    = require('../Google/credential')

const { getGoogleClient }  = require('../Google/plugin/client.js')
const { getMGraphClient }  = require('../Microsoft/plugin/client.js')
const { fetchGmailBody }   = require('../Google/workers/gmail/common')
const { fetchOutlookBody } = require('../Microsoft/workers/messages/common')


const ThreadMessage = {}



ThreadMessage.gmailBatchGetMessages = async function (googleMessageIds, googleCredentialId) {
  const credential = await GoogleCredential.get(googleCredentialId)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential not found')

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.readonly') )
    throw Error.BadRequest('Access is denied! Insufficient Permission.')


  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')


  try {
    return await fetchGmailBody(google, googleMessageIds)

  } catch (ex) {

    Context.log('Google-BatchGetMessages Failed!', ex)
    throw Error.BadRequest('Google-BatchGetMessages Failed!')
  }
}

ThreadMessage.outlookBatchGetMessages = async function (microsoftMessageIds, microsoftCredentialId) {
  const credential = await MicrosoftCredential.get(microsoftCredentialId)

  if (!credential)
    throw Error.ResourceNotFound('Microsoft-Credential Not Found!')

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

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

      const isRead = (root.labelIds) ? ((root.labelIds.includes('UNREAD')) ? false : true) : false

      message.is_read = isRead

      for (const attach of message.attachments) {
        attach.url = `emails/google/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
        attach.fullAddress = `${process.env.API_HOSTNAME}/emails/google/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
      }
    }

    if ( message.origin === 'outlook' ) {
      root = outlookMessagesBody[message.message_id]

      if ( root.status === 200 ) {
        message.is_read = root.isRead || false
  
        for (const attach of message.attachments) {
          attach.url = `emails/microsoft/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
          attach.fullAddress = `${process.env.API_HOSTNAME}/emails/microsoft/${message.owner}/messages/${message.message_id}/attachments/${attach.id}` 
        }
      }
    }

    if (root) {
      message.snippet     = root['snippet'] || ''
      message.unique_body = root['uniqueBody'] || ''
      message.html_body   = root['htmlBody'] || ''
      message.text_body   = root['textBody'] || ''
    }
  }

  return messages
}


Orm.register('thread_message', 'ThreadMessage', ThreadMessage)

module.exports = ThreadMessage