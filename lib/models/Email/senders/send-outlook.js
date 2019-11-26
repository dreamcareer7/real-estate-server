// const Socket           = require('../../Socket')
const MicrosoftCredential = require('../../Microsoft/credential')
const MicrosoftMessage    = require('../../Microsoft/message')



const outlookSender = async (email) => {
  const user = email.user

  const credential = await MicrosoftCredential.get(email.microsoft_credential)

  if (credential.revoked)
    throw 'Microsoft-Credential Is Revoked!'

  if ( credential.deleted_at )
    throw 'Microsoft-Credential Is Deleted!'

  if ( !credential.scope.includes('Mail.Send') && !credential.scope.includes('Mail.ReadWrite') )
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

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 500 )
    throw 'Recipients number should not be greater than 500!'


  let isReply = false

  if ( email.headers.message_id ) {
    isReply = true

    // Validate in_reply_to message
    await MicrosoftMessage.getByMessageId(email.headers.message_id, credential.id)
  }

  const params = {
    'messageId': email.headers ? ( email.headers.message_id || null ) : null,
    'credential': credential,

    'header': {
      'subject': email.subject,
      'from': `${credential.display_name} <${credential.email}> `,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients
    },

    'attachments': email.attachments || [],

    'body': {
      'text': email.text,
      'html': email.html
    },

    'internetMessageHeaders': [
      {
        'name': 'x-rechat-email-id',
        'value': email.id
      }
    ]
  }

  if (isReply) {
    await MicrosoftMessage.sendReply(params)
  } else {
    await MicrosoftMessage.createAndSendMessage(params)
  }

  return await MicrosoftCredential.forceSync(credential.id)
}


module.exports = outlookSender