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


module.exports = {
  parseRecipients,
  validateEmail
}