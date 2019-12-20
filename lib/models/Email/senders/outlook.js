const MicrosoftCredential = require('../../Microsoft/credential')
const MicrosoftMessage    = require('../../Microsoft/message')


const outlookSender = async (email) => {
  const credential = await MicrosoftCredential.get(email.microsoft_credential)

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

  if ( recipientsNum > 500 )
    throw Error.Validation('Recipients number should not be greater than 500!')

  const isReply = email.headers ? ( email.headers.message_id ? true : false ) : false

  if (isReply) {
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
      },
      {
        'name': 'x-rechat-host',
        'value': process.env.API_HOSTNAME
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