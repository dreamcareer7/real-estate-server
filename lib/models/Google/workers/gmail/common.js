const config  = require('../../../../config')
const sq      = require('../../../../utils/squel_extensions')
const mimelib = require('mimelib')
const base64  = require('js-base64').Base64 // "js-base64": "^2.5.1",
const Context = require('../../../Context')


const getFields = function (justBody = false) {
  /*
    id,threadId,labelIds,historyId,internalDate,sizeEstimate,
    payload(partId,mimeType,filename,headers,body(size,attachmentId),
      parts(partId,mimeType,filename,body(size,attachmentId),
        parts(partId,mimeType,filename,body(size,attachmentId),
          parts(partId,mimeType,filename,body(size,attachmentId)))))
  */

  if (justBody)
    return '&fields=id,labelIds,snippet,payload(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data)))))'
    
  const rootElements  = 'id,threadId,historyId,labelIds,internalDate'
  const subElements_1 = 'partId,mimeType,filename,headers,body(size,attachmentId)'
  const subElements_2 = 'partId,mimeType,filename,headers,body(size,attachmentId)'

  const fields = `&fields=${rootElements},payload(${subElements_1},parts(${subElements_2},parts(${subElements_2},parts(${subElements_2}))))`

  return fields
}

const parser = function (message) {
  const attachments   = []
  const recipients    = new Set()
  const targetHeaders = ['from', 'to', 'bcc', 'cc']

  let internetMessageId = null
  let inReplyTo = null
  let subject   = ''
  let from_raw  = {}
  let to_raw    = []
  let cc_raw    = []
  let bcc_raw   = []

  let parts = [message.payload]

  while (parts.length) {
    const part = parts.shift()

    if (part.parts)
      parts = parts.concat(part.parts)

    if (part.body.attachmentId) {

      let cid = ''

      if (part.headers) {
        for ( const header of part.headers ) {
          if ( header.name.toLowerCase() === 'content-id' )
            cid = header.value.substring(1, header.value.length - 1)
        }
      }

      attachments.push({
        'id': part.body.attachmentId,
        'cid': cid,
        'name': part.filename,
        'contentType': part.mimeType,
        'size': part.body.size,
        'isInline': ( Math.round(Number(part.partId)) === Number(part.partId) ) ? true : false
      })
    }
  }
 
  for (const header of message.payload.headers) {
    if ( targetHeaders.includes(header.name.toLowerCase()) ) {
      const addresses = mimelib.parseAddresses(header.value)
      addresses.map(a => recipients.add(a.address))
    }

    if ( header.name.toLowerCase() === 'message-id' )
      internetMessageId = header.value.substring(1, header.value.length - 1)

    if ( header.name.toLowerCase() === 'in-reply-to' )
      inReplyTo = header.value.substring(1, header.value.length - 1)

    if ( header.name.toLowerCase() === 'subject' ) {
      subject = header.value
      // subject = base64.decode(header.value.replace(/-/g, '+').replace(/_/g, '/'))
      // subject = ('=?utf-8?B?' + new Buffer(header.value).toString('base64') + '?=')
    }

    if ( header.name.toLowerCase() === 'from' )
      from_raw = mimelib.parseAddresses(header.value)[0]

    if ( header.name.toLowerCase() === 'to' )
      to_raw = mimelib.parseAddresses(header.value)

    if ( header.name.toLowerCase() === 'cc' )
      cc_raw = mimelib.parseAddresses(header.value)

    if ( header.name.toLowerCase() === 'bcc' )
      bcc_raw = mimelib.parseAddresses(header.value)
  }

  const recipientsArr = Array.from(recipients)

  const from = `${from_raw['name']} <${from_raw['address']}>`
  const to   = to_raw.map(record => record.address)
  const cc   = cc_raw.map(record => record.address)
  const bcc  = bcc_raw.map(record => record.address)

  let inBound = false
  let isRead  = false

  if (message.labelIds) {
    inBound = (message.labelIds.includes('SENT')) ? false : true
    isRead  = (message.labelIds.includes('UNREAD')) ? false : true
  } else {
    Context.log('SyncGoogle generateGMesssageRecord message, headers', message, JSON.stringify(message.payload.headers))
  }

  return {
    recipientsArr,
    attachments,
    internetMessageId,
    inReplyTo,
    subject,
    inBound,
    isRead,

    from_raw,
    to_raw,
    cc_raw,
    bcc_raw,

    from,
    to: sq.SqArray.from(to || []),
    cc: sq.SqArray.from(cc || []),
    bcc: sq.SqArray.from(bcc || [])
  }
}

const bodyParser = function (message) {

  function decode(input) {
    // this way does not escape special "B" characters
    // const text = Buffer.from(input, 'base64').toString('ascii')
    // return decodeURIComponent(escape(text))

    return base64.decode(input.replace(/-/g, '+').replace(/_/g, '/'))
  }

  const result = {
    snippet: message.snippet,
    text: '',
    html: ''
  }

  let parts = [message.payload]

  while (parts.length) {
    const part = parts.shift()

    if (part.parts)
      parts = parts.concat(part.parts)
   
    if (part.mimeType === 'text/plain')
      result.text = decode(part.body.data)

    if (part.mimeType === 'text/html')
      result.html = decode(part.body.data)
  }
 
  return result
}

const generateGMesssageRecord = function (credentialId, message) {
  try {

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
    
      from_raw: JSON.stringify(from_raw),
      to_raw: JSON.stringify(to_raw),
      cc_raw: JSON.stringify(cc_raw),
      bcc_raw: JSON.stringify(bcc_raw),
    
      '"from"': from,
      '"to"': to,
      cc: cc,
      bcc: bcc,
    
      message_created_at: new Date(Number(message.internalDate)).getTime(),
      message_date: new Date(Number(message.internalDate)).toISOString()
    
      // data: JSON.stringify(message)
    }

  } catch (ex) {

    Context.log('SyncGoogle generateGMesssageRecord message,ex', message, JSON.stringify(message.payload.headers), ex)
    return null
  }
}


const fetchMessages = async function (google) {
  const max = config.google_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num) // setFullYear, getFullYear

  let checkingDate = new Date().getTime()
  let messages     = []
  let rawMessages  = []

  const fields = getFields()

  for await (const response of google.discreteSyncMessages(50)) {
    if(!response.data.messages)
      break

    const batchRawResult = await google.batchGetMessages(response.data.messages, fields)

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

    Context.log('SyncGoogle ---- fetchMessages rawMessages.length', rawMessages.length)

    if (batchRawResult.error) {
      if ( batchRawResult.error.code === 429 || batchRawResult.error.code === 430 ) {
        throw new Error(batchRawResult.error.message)
      }
    }
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    messages     = messages.concat(response.data.messages)
    rawMessages  = rawMessages.concat(batchRawResult)

    if( messages.length >= max || checkingDate <= UTS )
      break
  }

  return rawMessages
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
      msg.labelIds    = message.labelIds
      msg.snippet     = snippet
      msg.uniqueBody  = ''
      msg.htmlBody    = html || ''
      msg.textBody    = text || ''
      msg.error       = null

    } else {

      msg.status      = message.error.code
      msg.id          = messageIdsMap[counter]
      msg.labelIds    = message.labelIds
      msg.snippet     = ''
      msg.uniqueBody  = ''
      msg.htmlBody    = ''
      msg.textBody    = ''
      msg.error       = message.error.message
    }

    messages[msg.id] = msg
  }

  return messages
}

const fetchHistory = async function (google, messages_sync_history_id) {
  let rawMessagesAdded   = []
  const messagesDeleted  = []

  const fields = getFields()

  for await (const response of google.discreteHistory(50, messages_sync_history_id)) {
    if(!response.data.history)
      break

    let messagesAdded = []

    for ( const history of response.data.history ) {

      if ( history.messagesAdded ) {
        for ( const message of history.messagesAdded )
          messagesAdded = messagesAdded.concat(message.message)
      }

      // history.messagesDeleted: [{"message":{"id":"16d76e86ef290ee6","threadId":"16d76e86ef290ee6","labelIds":["DRAFT"]}}]

      if ( history.messagesDeleted ) {
        for ( const message of history.messagesDeleted )
          messagesDeleted.push(message.message.id)
      }
    }

    const batchRawResultAded = await google.batchGetMessages(messagesAdded, fields)
    rawMessagesAdded = rawMessagesAdded.concat(batchRawResultAded)
  }

  return {
    rawMessagesAdded,
    messagesDeleted
  }
}



module.exports = {
  fetchMessages,
  fetchGmailBody,
  fetchHistory,
  bodyParser,
  getFields,
  parser,
  generateGMesssageRecord
}