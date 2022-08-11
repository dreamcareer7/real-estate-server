const { parseRecipients } = require('./parser')



const generateRecord = function (credential, message) {
  const fromAddress = message.from.emailAddress.address || message.sender.emailAddress.address || null
  const internet_message_id = message.internetMessageId.substring(1, message.internetMessageId.length - 1)
  const in_bound = (fromAddress === credential.email) ? false : true

  let in_reply_to = null

  if ( message.internetMessageHeaders ) {
    for ( const header of message.internetMessageHeaders ) {
      if ( header.name.toLowerCase() === 'in-reply-to' ) {
        in_reply_to = header.value.substring(1, header.value.length - 1)
      }
    }
  }

  const { recipientsArr, from_raw, to_raw, cc_raw, bcc_raw, from, to, cc, bcc } = parseRecipients(message)

  return {
    microsoft_credential: credential.id,
    message_id: message.id,
    thread_id: message.conversationId,
    thread_key: `${credential.id}${message.conversationId}`,
    internet_message_id,
    in_reply_to,
    in_bound,
    is_read: message.isRead || false,
    is_archived: message.isArchived || false,
    recipients: recipientsArr || [],

    subject: message.subject,
    has_attachments: message.hasAttachments || ((message?.attachments?.length > 0) ? true : false),
    attachments: message.attachments,

    from_raw: from_raw,
    to_raw: to_raw,
    cc_raw: cc_raw,
    bcc_raw: bcc_raw,

    from: from,
    to: to || [],
    cc: cc || [],
    bcc: bcc || [],

    message_created_at: Number(new Date(message.createdDateTime).getTime()),
    message_date: new Date(message.createdDateTime).toISOString(),

    deleted_at: message.isArchived ? new Date().toISOString() : null
  }
}

/**
 * @param {import('../../plugin/graph').MGraph} microsoft 
 * @param {string[]} message_ids
 * @returns {Promise<Record<string, IOutlookMessage>>}
 */
const fetchOutlookBody = async function (microsoft, message_ids, body_only) {
  /** @type {Record<string, IOutlookMessage>} */
  const messages      = {}
  const messageIdsMap = {}

  let counter = 1

  const select  = '?&$select=bodyPreview,uniqueBody,body,isRead'
  const expand  = !body_only ? '&$expand=attachments($select=id,name,contentType,size,isInline,microsoft.graph.fileAttachment/contentId)' : ''
  const ERR_MSG = 'Email is moved or deleted in the remote server'

  for (const id of message_ids) {
    messageIdsMap[counter ++] = id
  }

  do {
    const temp   = message_ids.splice(0,20)
    const result = await microsoft.batchGetMessagesNative(temp, select, expand)
  
    for (const message of result.responses) {
      const id = (message.body.id) ? message.body.id : messageIdsMap[Number(message.id)]

      messages[id] = {
        status: message.status,
        id: id,
        isRead: message.body.isRead,
        snippet: (message.body.bodyPreview) ? message.body.bodyPreview : '',
        uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : ERR_MSG,
        htmlBody: (message.body.body) ? message.body.body.content : ERR_MSG,
        textBody: '',
        attachments: message.body.attachments,
        error: (message.body.error) ? ((message.body.error.message) ? message.body.error.message : null) : null,
      }
    }

  } while ( message_ids.length > 0 )

  return messages  
}


module.exports = {
  generateRecord,
  fetchOutlookBody
}