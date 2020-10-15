// const config = require('../../../config')
const User = require('../../User/get')
const GoogleCredential = require('../../Google/credential')
const GoogleMessage    = require('../../Google/message')


const handleTracking = require('./tracking')

/*
  Gmail and outlook dont allow to add return-path header

  const Return_Path = `<gmail-bounces@${config.mailgun.domain}>`
  Header ==> 'Return-Path': Return_Path
*/


// I dont use promise.all() to prevent it from sending concurrent request to Google and Microsoft servers
const deleteGmailThreads = async (credentials, threadKeys) => {
  for await ( const credential of credentials ) {
    const messageIds = await GoogleMessage.getByThreadKeys(credential.id, threadKeys)
    await GoogleMessage.batchTrash(credential.id, messageIds)
  }
}

const deleteGmailMessages = async (credentials, messageIds) => {
  for await ( const credential of credentials ) {
    const googleMsgIds = await GoogleMessage.filterMessageIds(credential.id, messageIds)
    await GoogleMessage.batchTrash(credential.id, googleMsgIds)
  }
}

const updateGmailThreads = async (credentials, threadKeys, status) => {
  for await ( const credential of credentials ) {
    const messageIds = await GoogleMessage.getByThreadKeys(credential.id, threadKeys)
    await GoogleMessage.updateReadStatus(credential.id, messageIds, status)
  }
}

const updateGmailMessages = async (credentials, messageIds, status) => {
  for await ( const credential of credentials ) {
    const googleMsgIds = await GoogleMessage.filterMessageIds(credential.id, messageIds)
    await GoogleMessage.updateReadStatus(credential.id, googleMsgIds, status)
  }
}

const archiveGmailThreads = async (credentials, threadKeys) => {
  for await ( const credential of credentials ) {
    const messageIds = await GoogleMessage.getByThreadKeys(credential.id, threadKeys)
    await GoogleMessage.batchArchive(credential.id, messageIds)
  }
}

const archiveGmailMessages = async (credentials, messageIds) => {
  for await ( const credential of credentials ) {
    const googleMsgIds = await GoogleMessage.filterMessageIds(credential.id, messageIds)
    await GoogleMessage.batchArchive(credential.id, googleMsgIds)
  }
}

const gmailSender = async (email) => {
  const credential = await GoogleCredential.get(email.google_credential)
  const user       = await User.get(credential.user)

  const toRecipients  = email.to ? email.to.map(emailAddress => { return { address: emailAddress, name: '' } }) : []
  const ccRecipients  = email.cc ? email.cc.map(emailAddress => { return { address: emailAddress, name: '' } }) : [] 
  const bccRecipients = email.bcc ? email.bcc.map(emailAddress => { return { address: emailAddress, name: '' } }) : []

  const recipientsNum = toRecipients.length + ccRecipients.length + bccRecipients.length

  if ( recipientsNum === 0 ) {
    throw Error.Validation('No any recipients!')
  }

  if ( recipientsNum > 100 ) {
    throw Error.Validation('Recipients number should not be greater than 100!')
  }

  const from = ( user.first_name && user.last_name ) ? `${user.first_name} ${user.last_name}` : credential.display_name

  const params = {
    'credential': credential,

    'header': {
      'subject': email.subject,
      'from': `${from} <${credential.email}>`,
      'to': toRecipients,
      'cc': ccRecipients,
      'bcc': bccRecipients,
      'In-Reply-To': email.headers ? ( email.headers.in_reply_to ? `<${email.headers.in_reply_to}>` : '' ) : ''
    },

    'threadId': email.headers ? ( email.headers.thread_id || null ) : null,

    'attachments': email.attachments || [],

    'body': {
      'text': email.text,
      'html': handleTracking(email.html, email.id, 'gmail')
    }
  }

  const result      = await GoogleMessage.sendEmail(params)
  const sentMessage = await GoogleMessage.getRemoteMessage(credential.id, result.id, email.campaign)

  return sentMessage
}


module.exports = {
  gmailSender,
  deleteGmailThreads,
  deleteGmailMessages,
  updateGmailThreads,
  updateGmailMessages,
  archiveGmailThreads,
  archiveGmailMessages
}
