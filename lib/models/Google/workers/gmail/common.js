const sq = require('../../../../utils/squel_extensions')

const { bodyParser, parser } = require('./parser')
const { listLabels } = require('./label')
const { getFields }  = require('./fields')



const generateRecord = function (credentialId, message) {
  try {

    let deleted_at = null

    if (message?.labelIds?.includes('TRASH')) {
      deleted_at = new Date()
    }

    if ( message?.labelIds?.includes('SPAM') || message?.labelIds?.includes('DRAFT') ) {
      return null
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
      So you have to try again to send the whole Batch-Request till there is no any 429 error message.

      TypeError: Cannot read property 'parts' of undefined
    */

    /*
      Unkown global error!!!
      {"error":{"errors":[{"domain":"global","reason":"failedPrecondition","message":"Bad Request"}]
    */

    return null
  }
}

const processLabels = async function (credentialId, messages) {
  const archivedMsgIds = []

  const mainLabels  = ['SENT', 'INBOX']
  const gmailLabels = await listLabels(credentialId)

  for (const msg of messages) {
    msg.is_archived = (msg.label_ids && (msg.label_ids.length !== 0) && (msg.label_ids.some(r => mainLabels.indexOf(r) >= 0) || msg.label_ids.some(r => gmailLabels.userLabels.indexOf(r) >= 0))) ? false : true
    msg.label_ids   = msg.label_ids ? JSON.stringify(msg.label_ids) : JSON.stringify([])

    if (msg.is_archived) {
      archivedMsgIds.push(msg.message_id)
    }
  }

  return archivedMsgIds
}

const fetchGmailBody = async function (google, googleMessageIds) {
  const messages      = {}
  const messageIdsMap = {}

  let counter = 1

  for (const id of googleMessageIds) {
    messageIdsMap[counter ++] = id
  }

  const result = await google.batchGetMessages(googleMessageIds, getFields('body'))

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


module.exports = {
  generateRecord,
  processLabels,
  fetchGmailBody
}