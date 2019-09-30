const sq = require('../../../../utils/squel_extensions')


const validateEmail = (email) => {
  if (!email)
    return false

  const re = /\S+@\S+\.\S+/

  return re.test(email)
}

const parseRecipients = (message) => {
  const recipients = new Set()

  function escapeDoubleQuotes(str) {
    return str.replace(/\\([\s\S])|(")/g,"\\$1$2") // eslint-disable-line
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

  const from = `${from_raw['name']} <${from_raw['address']}>`
  const to   = to_raw.map(record => record.address)
  const cc   = cc_raw.map(record => record.address)
  const bcc  = bcc_raw.map(record => record.address)

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

const generateMMesssageRecord = function (credentialId, currentEmail, message) {
  const fromAddress = message.from.emailAddress.address || message.sender.emailAddress.address || null

  let inBound = true

  if (fromAddress) {
    if ( fromAddress === currentEmail )
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
    microsoft_credential: credentialId,
    message_id: message.id,
    thread_id: message.conversationId,
    thread_key: `${credentialId}${message.conversationId}`,
    internet_message_id: internetMessageId,
    in_reply_to: inReplyTo,
    in_bound: inBound,
    recipients: `{${recipientsArr.join(',')}}`,

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
        snippet: (message.body.bodyPreview) ? message.body.bodyPreview : '',
        uniqueBody: (message.body.uniqueBody) ? message.body.uniqueBody.content : '',
        htmlBody: (message.body.body) ? message.body.body.content : '',
        textBody: '',
        error: (message.body.error) ? ((message.body.error.message) ? message.body.error.message : null) : null,
      }
    }

  } while ( microsoftMessageIds.length > 0 )

  return messages  
}


module.exports = {
  validateEmail,
  parseRecipients,
  generateMMesssageRecord,
  fetchOutlookBody
}