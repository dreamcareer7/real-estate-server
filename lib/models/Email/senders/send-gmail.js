const Socket           = require('../../Socket')
const GoogleCredential = require('../../Google/credential')
const GoogleMessage    = require('../../Google/message')



const gmailSender = async email => {
  const user = email.user

  const credential = await GoogleCredential.get(email.google_credential)

  if ( !credential )
    throw 'Google-Credential not found'

  if (credential.revoked)
    throw 'Google-Credential Is Revoked!'

  if ( !credential.deleted_at )
    throw 'Google-Credential Is Deleted!'

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') )
    throw 'Access is denied! Insufficient Permission! Reconnect Your Account!'

  if ( credential.user !== user )
    throw 'Invalid user credential!'


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


  if ( toRecipients.length === 0 )
    throw 'To is not specified!'

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 100 )
    throw 'Recipients number should not be greater than 100!'

  const params = {
    'credential': credential,

    'header': {
      'subject': email.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients,
      'In-Reply-To': `<${email.headers.in_reply_to}>` || null
    },

    'threadId': email.headers.thread_id || null,

    'attachments': email.attachments || [],

    'body': {
      'text': email.text,
      'html': email.html
    }
  }

  const result      = await GoogleMessage.sendEmail(params)
  const sentMessage = await GoogleMessage.getRemoteMessage(credential, result.id)

  Socket.send('Gmail.Message.Sent', email.user, [sentMessage])

  return sentMessage.id
}


module.exports = gmailSender