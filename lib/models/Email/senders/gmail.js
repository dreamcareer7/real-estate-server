const GoogleCredential = require('../../Google/credential')
const GoogleMessage    = require('../../Google/message')


const gmailSender = async email => {
  const credential = await GoogleCredential.get(email.google_credential)

  const toRecipients = email.to.map(emailAddress => {
    return {
      address: emailAddress,
      name: ''
    }
  }) || []

  const ccRecipients = email.cc.map(emailAddress => {
    return {
      address: emailAddress,
      name: ''
    }
  }) || []

  const bccRecipients = email.bcc.map(emailAddress => {
    return {
      address: emailAddress,
      name: ''
    }
  }) || []


  const recipientsNum = toRecipients.length + ccRecipients.length + bccRecipients.length

  if ( recipientsNum === 0 )
    throw Error.Validation('No any recipients!')

  if ( recipientsNum > 100 )
    throw Error.Validation('Recipients number should not be greater than 100!')

  const params = {
    'credential': credential,

    'header': {
      'subject': email.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients,
      'In-Reply-To': email.headers ? ( email.headers.in_reply_to ? `<${email.headers.in_reply_to}>` : '' ) : ''
    },

    'threadId': email.headers ? ( email.headers.thread_id || null ) : null,

    'attachments': email.attachments || [],

    'body': {
      'text': email.text,
      'html': email.html
    }
  }

  const result      = await GoogleMessage.sendEmail(params)
  const sentMessage = await GoogleMessage.getRemoteMessage(credential.id, result.id)

  return sentMessage
}


module.exports = gmailSender