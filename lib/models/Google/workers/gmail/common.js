const config  = require('../../../../config')
const sq      = require('../../../../utils/squel_extensions')
const Context = require('../../../Context')

const { bodyParser, parser } = require('./parser')
const { listLabels } = require('./label')
const { getFields }  = require('./static')



const generateRecord = function (credentialId, message) {
  try {

    let deleted_at = null

    // Filter out spam and draft messages
    if (message.labelIds) {
      if ( message.labelIds.includes('SPAM') || message.labelIds.includes('DRAFT') ) {
        return null
      }

      if (message.labelIds.includes('TRASH')) {
        deleted_at = new Date()
      }
    }

    const {
      recipientsArr, attachments, internetMessageId, inReplyTo, subject, inBound, isRead,
      from_raw, to_raw, cc_raw, bcc_raw,
      from, to, cc, bcc
    } = parser(message)
  
    return {
      google_credential: credentialId,
      message_id: message.id,
      thread_id: message.threadId,
      thread_key: `${credentialId}${message.threadId}`,
      history_id: message.historyId,
      internet_message_id: internetMessageId,
      in_reply_to: inReplyTo,
      in_bound: inBound,
      is_read: isRead,
      recipients: sq.SqArray.from(recipientsArr || []),

      subject: subject,
      has_attachments: (attachments.length > 0) ? true : false,
      attachments: JSON.stringify(attachments),
      label_ids: message.labelIds || [],
    
      from_raw: JSON.stringify(from_raw),
      to_raw: JSON.stringify(to_raw),
      cc_raw: JSON.stringify(cc_raw),
      bcc_raw: JSON.stringify(bcc_raw),
    
      '"from"': from,
      '"to"': to,
      cc: cc,
      bcc: bcc,

      message_created_at: new Date(Number(message.internalDate)).getTime(),
      message_date: new Date(Number(message.internalDate)).toISOString(),

      deleted_at: deleted_at ? deleted_at.toISOString() : null
    }

  } catch (ex) {

    /*
      This case occurs rarely, Its not easy to be handled, becaues google does not respons with the id of failed-request.
      So you have to try agin to send the whole Batch-Request till there is no any 429 error message.

      ** Right now we dont support exponential-backoff for Google.

      // https://developers.google.com/drive/api/v3/handle-errors#exponential-backoff

      {
        "error": {
          "errors": [{
            "domain": "usageLimits",
            "reason": "rateLimitExceeded",
            "message": "Rate Limit Exceeded"
          }],
          "code": 429,
          "message": "Rate Limit Exceeded"
        }
      }

      TypeError: Cannot read property 'parts' of undefined
    */

    /*
      Unkown global error!!!
      {"error":{"errors":[{"domain":"global","reason":"failedPrecondition","message":"Bad Request"}]
    */

    Context.log('SyncGoogle generateRecord message,ex', JSON.stringify(message), ex)
    return null
  }
}

const processLabels = async function (credentialId, messages) {
  const gmailLabels = await listLabels(credentialId)

  const mainLabels = ['SENT', 'INBOX']

  for (const msg of messages) {
    msg.is_archived = (msg.label_ids && msg.label_ids.some(r => mainLabels.indexOf(r) >= 0) || msg.label_ids.some(r => gmailLabels.userLabels.indexOf(r) >= 0)) ? false : true
    msg.label_ids   = msg.label_ids ? JSON.stringify(msg.label_ids) : JSON.stringify([])
  }
}

const fetchMessages = async function (google, max) {
  const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num)

  let rateLimitExceeded = false

  let checkingDate = new Date().getTime()
  let messages     = []
  let rawMessages  = []

  const fields = getFields()

  for await (const response of google.discreteSyncMessages(50)) {
    Context.log('SyncGoogle - fetchMessages loop rawMessages.length', rawMessages.length)

    if(!response.data.messages) {
      break
    }

    const ids = response.data.messages.map(message => message.id)
    const batchRawResult = await google.batchGetMessages(ids, fields)

    /*
      batchRawResult could be:
      {
        "error": {
          "errors": [{
            "domain": "usageLimits",
            "reason": "rateLimitExceeded",
            "message": "Too many concurrent requests for user"
          }],
          "code": 429,
          "message": "Too many concurrent requests for user"
        }
      }
    */

    if (batchRawResult.error) {
      if ( batchRawResult.error.code === 429 || batchRawResult.error.code === 430 ) {
        rateLimitExceeded = true
        break
      }
    }
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    messages     = messages.concat(response.data.messages)
    rawMessages  = rawMessages.concat(batchRawResult)

    if( rawMessages.length >= max || checkingDate <= UTS )
      break
  }

  if (rateLimitExceeded) {
    return {
      rawMessages: null,
      error: {
        message: 'rateLimitExceeded',
        status: 429, 
        statusCode: 429
      }
    }
  }

  return {
    rawMessages,
    error: null
  }
}

const fetchGmailBody = async function (google, googleMessageIds) {
  const messages      = {}
  const messageIdsMap = {}

  let counter = 1

  for (const id of googleMessageIds) {
    messageIdsMap[counter ++] = id
  }

  const result = await google.batchGetMessages(googleMessageIds, getFields(true))

  counter = 0

  for ( const message of result ) {
    counter ++

    const msg = {}

    if (message.error) {

      msg.status      = message.error.code
      msg.id          = messageIdsMap[counter]
      msg.labelIds    = message.labelIds
      msg.snippet     = ''
      msg.uniqueBody  = ''
      msg.htmlBody    = ''
      msg.textBody    = ''
      msg.error       = message.error.message

    } else {

      const { snippet, text, html } = bodyParser(message)

      msg.status      = 200
      msg.id          = message.id
      msg.labelIds    = message.labelIds
      msg.snippet     = snippet
      msg.uniqueBody  = ''
      msg.htmlBody    = html || ''
      msg.textBody    = text || ''
      msg.error       = null
    }

    messages[msg.id] = msg
  }

  return messages
}

const fetchHistory = async function (google, messages_sync_history_id) {
  const fields     = getFields()
  const deletedIds = new Set()
  const messageIds = new Set()

  let rawMessages = []

  for await (const response of google.discreteHistory(50, messages_sync_history_id)) {
    Context.log('SyncGoogle - fetchHistory loop rawMessages.length', rawMessages.length)

    if (response.data.error) {
      if (response.data.error.code === 404 ) {
        return {
          needsFullSync: true,
          rawMessages,
          deletedIds: []
        }
      }
    }

    if(!response.data.history) {
      break
    }

    const temp = new Set()

    for ( const history of response.data.history ) {

      if ( history.messagesAdded ) {
        for ( const msg of history.messagesAdded ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.labelsAdded ) {
        for ( const msg of history.labelsAdded ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.labelsRemoved ) {
        for ( const msg of history.labelsRemoved ) {
          if (!messageIds.has(msg.message.id)) {
            temp.add(msg.message.id)
          }
          messageIds.add(msg.message.id)
        }
      }

      if ( history.messagesDeleted ) {
        for ( const msg of history.messagesDeleted ) {
          deletedIds.add(msg.message.id)

          if (messageIds.has(msg.message.id)) {
            messageIds.delete(msg.message.id)
            temp.delete(msg.message.id)
          }
        }
      }
    }

    if ( temp.size ) {
      const batchRawResultAded = await google.batchGetMessages(Array.from(temp), fields)
      rawMessages = rawMessages.concat(batchRawResultAded)
    }
  }

  return {
    needsFullSync: false,
    rawMessages,
    messageIds,
    deletedIds: Array.from(deletedIds)
  }
}


module.exports = {
  generateRecord,
  processLabels,
  fetchMessages,
  fetchGmailBody,
  fetchHistory
}