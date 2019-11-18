const Context             = require('../../Context')
const Socket              = require('../../Socket')
const Slack               = require('../../Slack')
const MicrosoftCredential = require('../../Microsoft/credential')
const MicrosoftMessage    = require('../../Microsoft/message')

const Email = require('../index')



const sendSlackMessage = (text, ex) => {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text: text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: text, emoji: ':skull:' })
}

const sendViaOutlook = async email => {
  const user = email.user

  const credential = await MicrosoftCredential.get(email.microsoft_credential)

  if ( !credential ) {
    Context.log('Microsoft-Credential not found')
    return
  }

  if (credential.revoked) {
    Context.log('Microsoft-Credential Is Revoked!')
    return
  }

  if ( !credential.deleted_at ) {
    Context.log('Microsoft-Credential Is Deleted!')
    return
  }

  if ( !credential.scope.includes('Mail.Send') && !credential.scope.includes('Mail.ReadWrite') ) {
    Context.log('Access is denied! Insufficient Permission! Reconnect Your Account!')
    return
  }

  if ( credential.user !== user ) {
    Context.log('Invalid user credential!')
    return
  }

  /*
    Recipients structure: [{ address: 'email_domain.com', name: 'name' }]
  */

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

  if ( toRecipients.length === 0 ) {
    Context.log('To is not specified!')
    return
  }

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 500 ) {
    Context.log('Recipients number should not be greater than 500!')
    return
  }


  let isReply = false

  if ( email.headers.message_id ) {
    // If this is a reply to a thread, subject should not be altered
    // Adding "Re: " to the head of the subject is allowed

    isReply = true

    const replyToMessage = await MicrosoftMessage.get(email.headers.message_id, credential.id)

    if ( !replyToMessage ) {
      Context.log(`Microsoft-Message ${email.headers.message_id} Not Found!`)
      return
    }
  }

  const params = {
    'messageId': email.headers.message_id,
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
    }
  }

  let result = {}

  try {

    if (isReply) {
      result = await MicrosoftMessage.sendReply(params)    
    } else {
      result = await MicrosoftMessage.createAndSendMessage(params)
    }

    // await Email.storeGoogleMessageId(email.id, sentMessage.id)
    Socket.send('Gmail.Message.Sent', email.user, [result])

    return

  } catch (ex) {

    await MicrosoftCredential.forceSync(credential.id)

    const text = `Outlook-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Outlook-Send-Email-Failed Ex: ${JSON.stringify(ex)}`
    sendSlackMessage(text, msg)

    return
  }
}


module.exports = sendViaOutlook