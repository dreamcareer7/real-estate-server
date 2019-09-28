const config  = require('../../../../config')
const sq      = require('../../../../utils/squel_extensions')
const mimelib = require('mimelib')



const getFields = function (jusBody = false) {
  /*
    id,threadId,labelIds,historyId,internalDate,sizeEstimate,
    payload(partId,mimeType,filename,headers,body(size,attachmentId),
      parts(partId,mimeType,filename,body(size,attachmentId),
        parts(partId,mimeType,filename,body(size,attachmentId),
          parts(partId,mimeType,filename,body(size,attachmentId)))))
  */

  if (jusBody)
    return '&fields=id,snippet,payload(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data),parts(mimeType,body(size,data)))))'
    
  const rootElements  = 'id,threadId,historyId,labelIds,internalDate'
  const subElements_1 = 'partId,mimeType,filename,headers,body(size,attachmentId)'
  const subElements_2 = 'partId,mimeType,filename,body(size,attachmentId)'

  const fields = `&fields=${rootElements},payload(${subElements_1},parts(${subElements_2},parts(${subElements_2},parts(${subElements_2}))))`

  return fields
}

const fetchMessages = async function (google) {
  const max = config.google_sync.max_sync_emails_num
  const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num) // setFullYear, getFullYear

  let checkingDate = new Date().getTime()
  let messages     = []
  let rawMessages  = []

  const fields = getFields()

  for await (const response of google.discreteSyncMessages()) {
    if(!response.data.messages)
      break

    const batchRawResult = await google.batchGetMessages(response.data.messages, fields)
    
    checkingDate = parseInt(batchRawResult[batchRawResult.length - 1]['internalDate'])
    messages     = messages.concat(response.data.messages)
    rawMessages  = rawMessages.concat(batchRawResult)

    if( messages.length >= max || checkingDate <= UTS )
      break
  }

  return rawMessages
}

const fetchHistory = async function (google, messages_sync_history_id) {
  let rawMessagesAdded   = []
  const messagesDeleted  = []

  const fields = getFields()

  for await (const response of google.discreteHistory(messages_sync_history_id)) {
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
      attachments.push({
        'id': part.body.attachmentId,
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

    if ( header.name.toLowerCase() === 'subject' )
      subject = header.value

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

  return {
    recipientsArr,
    attachments,
    internetMessageId,
    inReplyTo,
    subject,

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
    const text = Buffer.from(input, 'base64').toString('ascii')
    return decodeURIComponent(escape(text))
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


module.exports = {
  fetchMessages,
  fetchHistory,
  bodyParser,
  getFields,
  parser
}