const config = require('../../../config')

const MicrosoftCredential = require('../../Microsoft/credential')
const MicrosoftMessage    = require('../../Microsoft/message')

const UsersJob = require('../../../models/UsersJob')

/*
  Gmail and outlook dont allow to add return-path header

  const Return_Path = `<outlook-bounces@${config.mailgun.General.domain}?`
  Header ==> 'Return-Path': Return_Path
*/


const deleteOutlookThreads = async (credentials, threadKeys) => {
  for await ( const credential of credentials ) {
    const messageIds = await MicrosoftMessage.getByThreadKeys(credential.id, threadKeys)
    await MicrosoftMessage.batchTrash(credential, messageIds)
  }
}

const deleteOutlookMessages = async (credentials, messageIds) => {
  for await ( const credential of credentials ) {
    const outlookMsgIds = await MicrosoftMessage.filterMessageIds(credential.id, messageIds)
    await MicrosoftMessage.batchTrash(credential, outlookMsgIds)
  }
}

const UpdateOutlookThreads = async (credentials, threadKeys, status) => {
  for await ( const credential of credentials ) {
    const messageIds = await MicrosoftMessage.getByThreadKeys(credential.id, threadKeys)
    await MicrosoftMessage.updateReadStatus(credential, messageIds, status)
  }
}

const updateOutlookMessages = async (credentials, messageIds, status) => {
  for await ( const credential of credentials ) {
    const outlookMsgIds = await MicrosoftMessage.filterMessageIds(credential.id, messageIds)
    await MicrosoftMessage.updateReadStatus(credential, outlookMsgIds, status)
  }
}

const archiveOutlookThreads = async (credentials, threadKeys) => {
  for await ( const credential of credentials ) {
    const messageIds = await MicrosoftMessage.getByThreadKeys(credential.id, threadKeys)
    await MicrosoftMessage.batchArchive(credential, messageIds)
  }
}

const archiveOutlookMessages = async (credentials, messageIds) => {
  for await ( const credential of credentials ) {
    const outlookMsgIds = await MicrosoftMessage.filterMessageIds(credential.id, messageIds)
    await MicrosoftMessage.batchArchive(credential, outlookMsgIds)
  }
}

const outlookSender = async (email) => {
  const credential = await MicrosoftCredential.get(email.microsoft_credential)

  // error code: 429 
  // header Retry-After seconds
  if ( Number(credential.send_email_after) > new Date().getTime() ) {
    throw new Error('rate-limit-exceed')
  }

  const toRecipients  = email.to ? email.to.map(emailAddress => { return { address: emailAddress, name: '' } }) : []
  const ccRecipients  = email.cc ? email.cc.map(emailAddress => { return { address: emailAddress, name: '' } }) : []
  const bccRecipients = email.bcc ? email.bcc.map(emailAddress => { return { address: emailAddress, name: '' } }) : []

  const recipientsNum = toRecipients.length + ccRecipients.length + bccRecipients.length

  if ( recipientsNum === 0 ) {
    throw Error.Validation('No any recipients!')
  }

  if ( recipientsNum > 500 ) {
    throw Error.Validation('Recipients number should not be greater than 500!')
  }

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

    'extensions': [
      {
        '@odata.type': 'microsoft.graph.openTypeExtension',
        'extensionName': config.microsoft_integration.openExtension.outlook.name,
        'rechatEmailId': email.id,
        'rechatHost': process.env.API_HOSTNAME
      }
    ]
  }

  try {
    if (isReply) {
      await MicrosoftMessage.sendReply(params)
    } else {
      await MicrosoftMessage.createAndSendMessage(params)
    }

    try {
      await UsersJob.forceSyncByMicrosoftCredential(credential.id, 'outlook')
    } catch (err) {
      // do nothing
    }

  } catch (ex) {

    if ( ex.statusCode === 429 ) {
      const ts = new Date().getTime() + (30 * 1000)
      await MicrosoftCredential.updateSendEmailAfter(credential.id, ts)
      throw new Error('rate-limit-exceed')
    }

    throw ex
  }

  return
}


module.exports = {
  outlookSender,
  deleteOutlookThreads,
  deleteOutlookMessages,
  UpdateOutlookThreads,
  updateOutlookMessages,
  archiveOutlookThreads,
  archiveOutlookMessages
}
