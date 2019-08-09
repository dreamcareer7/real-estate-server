const config  = require('../../../../config')
const mimelib = require('mimelib')



const getFields = function () {
  /*
    id,threadId,labelIds,historyId,internalDate,sizeEstimate,
    payload(partId,mimeType,filename,headers,body(size,attachmentId),
      parts(partId,mimeType,filename,body(size,attachmentId),
        parts(partId,mimeType,filename,body(size,attachmentId),
          parts(partId,mimeType,filename,body(size,attachmentId)))))
  */

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
  let rawMessagesDeleted = []

  const fields = getFields()

  for await (const response of google.discreteHistory(messages_sync_history_id)) {
    if(!response.data.history)
      break

    let messagesAdded   = []
    let messagesDeleted = []

    for ( const history of response.data.history ) {

      if ( history.messagesAdded ) {
        for ( const message of history.messagesAdded )
          messagesAdded = messagesAdded.concat(message.message)
      }

      if ( history.messagesDeleted ) {
        for ( const message of history.messagesDeleted )
          messagesDeleted = messagesDeleted.concat(message.message)
      }
    }

    const batchRawResultAded = await google.batchGetMessages(messagesAdded, fields)
    rawMessagesAdded = rawMessagesAdded.concat(batchRawResultAded)

    const batchRawResultDeleted = await google.batchGetMessages(messagesDeleted, fields)
    rawMessagesDeleted = rawMessagesDeleted.concat(batchRawResultDeleted)
  }

  return {
    rawMessagesAdded,
    rawMessagesDeleted
  }
}

const parser = function (message) {
  const attachments   = []
  const recipients    = new Set()
  const targetHeaders = ['from', 'to', 'bcc', 'cc']

  let internetMessageId = ''
  let subject = ''
  let from    = {}
  let to      = []
  let cc      = []
  let bcc     = []

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

    if ( header.name.toLowerCase() === 'subject' )
      subject = header.value

    if ( header.name.toLowerCase() === 'from' )
      from = mimelib.parseAddresses(header.value)

    if ( header.name.toLowerCase() === 'to' )
      to = mimelib.parseAddresses(header.value)

    if ( header.name.toLowerCase() === 'cc' )
      cc = mimelib.parseAddresses(header.value)

    if ( header.name.toLowerCase() === 'bcc' )
      bcc = mimelib.parseAddresses(header.value)
  }

  const recipientsArr = Array.from(recipients)

  return {
    recipientsArr,
    attachments,
    internetMessageId,
    subject,
    from,
    to,
    cc,
    bcc
  }
}


module.exports = {
  fetchMessages,
  fetchHistory,
  parser
}