const sq = require('../../../../utils/squel_extensions')


const syncMessagesPprojection = [
  'id', 'parentFolderId', 'conversationId',
  'internetMessageHeaders', 'internetMessageId',
  'createdDateTime', 'lastModifiedDateTime',
  'sender', 'from', 'toRecipients', 'ccRecipients', 'bccRecipients',
  'hasAttachments', 'subject', 'isDraft', 'isRead'
  // 'bodyPreview', 'uniqueBody', 'body'
]

const extractContactsProjection = [
  'id', 'createdDateTime', 'from', 'sender', 'toRecipients', 'ccRecipients', 'bccRecipients', 'subject', 'isDraft'
]

const wellKnownFolders = {
  beta: [
    'inbox', 'junkemail', 'archive', 'deleteditems', 'drafts', 'sentitems', 'outbox',
    'scheduled', 'searchfolders', 'serverfailures', 'syncissues', 'conversationhistory',
    'localfailures', 'recoverableitemsdeletions', 'msgfolderroot', 'clutter', 'conflicts'
  ],

  one: ['Archive', 'Conversation History', 'Deleted Items', 'Drafts', 'Inbox', 'Junk Email', 'Outbox', 'Sent Items']
}


const validateEmail = (email) => {
  if (!email)
    return false

  const re = /\S+@\S+\.\S+/

  return re.test(email)
}

const parseRecipients = (message) => {
  const recipients = new Set()

  function escapeDoubleQuotes(str) {
    return str.replace(/\\([\s\S])|(")/g,"\\$1$2").toLowerCase() // eslint-disable-line
  }

  if (validateEmail(message.from.emailAddress.address))
    recipients.add(escapeDoubleQuotes(message.from.emailAddress.address))

  if (validateEmail(message.sender.emailAddress.address))
    recipients.add(escapeDoubleQuotes(message.sender.emailAddress.address))

  for (const record of message.toRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(escapeDoubleQuotes(record.emailAddress.address))
  }

  for (const record of message.ccRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(escapeDoubleQuotes(record.emailAddress.address))
  }

  for (const record of message.bccRecipients ) {
    if(validateEmail(record.emailAddress.address))
      recipients.add(escapeDoubleQuotes(record.emailAddress.address))
  }

  const recipientsArr = Array.from(recipients)

  const from_raw = (message.from) ? message.from.emailAddress : {}
  const to_raw   = (message.toRecipients.length) ? message.toRecipients.map(record => record.emailAddress) : []
  const cc_raw   = (message.ccRecipients.length) ? message.ccRecipients.map(record => record.emailAddress) : []
  const bcc_raw  = (message.bccRecipients.length) ? message.bccRecipients.map(record => record.emailAddress) : []

  const fromName    = from_raw['name']
  const fromAddress = from_raw['address'] ? from_raw['address'].toLowerCase() : ''
  const from        = `${fromName} <${fromAddress}>`
  
  const to   = to_raw.filter(record => { if (record.address) return true }).map(record => record.address.toLowerCase())
  const cc   = cc_raw.filter(record => { if (record.address) return true }).map(record => record.address.toLowerCase())
  const bcc = bcc_raw.filter(record => { if (record.address) return true }).map(record => record.address.toLowerCase())

  return {
    recipientsArr,
    from_raw,
    to_raw,
    cc_raw,
    bcc_raw,
    from,
    to,
    cc,
    bcc
  }
}

const generateMMesssageRecord = function (credential, message) {
  const fromAddress = message.from.emailAddress.address || message.sender.emailAddress.address || null

  let inBound = true

  if (fromAddress) {
    if ( fromAddress === credential.email )
      inBound = false
  }

  let inReplyTo = null

  if ( message.internetMessageHeaders ) {
    for ( const header of message.internetMessageHeaders ) {
      if ( header.name.toLowerCase() === 'in-reply-to' )
        inReplyTo = header.value.substring(1, header.value.length - 1)
    }
  }

  const internetMessageId = message.internetMessageId.substring(1, message.internetMessageId.length - 1)

  const { recipientsArr, from_raw, to_raw, cc_raw, bcc_raw, from, to, cc, bcc } = parseRecipients(message)

  return {
    microsoft_credential: credential.id,
    message_id: message.id,
    thread_id: message.conversationId,
    thread_key: `${credential.id}${message.conversationId}`,
    internet_message_id: internetMessageId,
    in_reply_to: inReplyTo,
    in_bound: inBound,
    is_read: message.isRead || false,
    recipients: sq.SqArray.from(recipientsArr || []),

    subject: message.subject,
    has_attachments: (message.attachments.length > 0) ? true : false,
    attachments: JSON.stringify(message.attachments),

    from_raw: JSON.stringify(from_raw),
    to_raw: JSON.stringify(to_raw),
    cc_raw: JSON.stringify(cc_raw),
    bcc_raw: JSON.stringify(bcc_raw),

    '"from"': from,
    '"to"': sq.SqArray.from(to || []),
    cc: sq.SqArray.from(cc || []),
    bcc: sq.SqArray.from(bcc || []),

    message_created_at: Number(new Date(message.createdDateTime).getTime()),
    message_date: new Date(message.createdDateTime).toISOString()

    // data: JSON.stringify(message)
  }
}

const getByInternetMsgId = async function(microsoft, select, expand, iMsgId) {
  const url = `https://graph.microsoft.com/v1.0/me/messages${select}&$filter=internetMessageId eq '<${iMsgId}>'${expand}`

  try {
    const messages = await microsoft.geMessagesByUrl(url)

    return {
      status: 200,
      body: messages[0]
    }

  } catch (ex) {
    return {
      status: 404,
      body: {
        id: null,
        isRead: null,
        bodyPreview: 'Email is moved or deleted in the remote server',
        body: { content: 'Email is moved or deleted in the remote server' },
        uniqueBody: { content: 'Email is moved or deleted in the remote server' },
        attachments: []
      }
    }
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
  syncMessagesPprojection,
  extractContactsProjection,
  wellKnownFolders,
  validateEmail,
  parseRecipients,
  generateMMesssageRecord,
  getByInternetMsgId,
  fetchOutlookBody
}