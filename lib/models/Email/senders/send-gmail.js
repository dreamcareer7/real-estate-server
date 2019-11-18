const Context          = require('../../Context')
const Socket           = require('../../Socket')
const Slack            = require('../../Slack')
const GoogleCredential = require('../../Google/credential')
const GoogleMessage    = require('../../Google/message')

const Email = require('../index')
 


const sendSlackMessage = (text, ex) => {
  Context.log(ex)

  Slack.send({ channel: '7-server-errors',  text: text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: text, emoji: ':skull:' })
}

const sendViaGmail = async email => {
  const user = email.user

  const credential = await GoogleCredential.get(email.google_credential)

  if ( !credential ) {
    Context.log('Google-Credential not found')
    return
  }

  if (credential.revoked) {
    Context.log('Google-Credential Is Revoked!')
    return
  }

  if ( !credential.deleted_at ) {
    Context.log('Google-Credential Is Deleted!')
    return
  }

  if ( !credential.scope.includes('https://www.googleapis.com/auth/gmail.send') ) {
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

  if ( (toRecipients.length + ccRecipients.length + bccRecipients.length) > 100 ) {
    Context.log('Recipients number should not be greater than 100!')
    return
  }

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

  try {

    const result      = await GoogleMessage.sendEmail(params)
    const sentMessage = await GoogleMessage.getRemoteMessage(credential, result.id)

    Socket.send('Gmail.Message.Sent', email.user, [sentMessage])


    Context.log('Sent a gmail-message'.cyan, sentMessage.id, credential.id)

    await Email.storeGoogleMessageId(email.id, sentMessage.id)

    return sentMessage.id

  } catch (ex) {

    const text = `Gmail-Send-Email-Failed - credential: ${credential.id} - Ex: ${ex.message}`
    const msg  = `Gmail-Send-Email-Failed Ex: ${ex}`
    sendSlackMessage(text, msg)

    return null
  }
}


module.exports = sendViaGmail