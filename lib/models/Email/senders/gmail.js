// const config = require('../../../config')
const GoogleCredential = require('../../Google/credential')
const GoogleMessage    = require('../../Google/message')

const Url = require('../../Url')


/*
  Gmail and outlook dont allow to add return-path header

  const Return_Path = `<gmail-bounces@${config.mailgun.General.domain}>`
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

/**
 * @param {String} html html_body
 * @param {UUID} email email.id
 * @param {String} origin gmail/outlook
 */
const handleTracking = async function (html, email, origin) {  
  const $ = cheerio.load(html, { xmlMode: true })

  $('a').each(function(i, link){
    const enc   = Crypto.encrypt($(link).attr('href'))
    const url   = Url.web({ uri: '/emails/events/redirect' })
    $(link).attr('href', `${url}/${enc}`)
  })

  const enc   = Crypto.encrypt(JSON.stringify({ email, origin }))
  const url   = Url.web({ uri: '/emails/events' })
  const pixel = `<img src="${url}/${enc}">`

  return $.root().append(pixel)
}


const gmailSender = async (email) => {
  const credential = await GoogleCredential.get(email.google_credential)

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
      'html': handleTracking(email.html, email.id, 'gmail')
    }
  }

  const result      = await GoogleMessage.sendEmail(params)
  const sentMessage = await GoogleMessage.getRemoteMessage(credential.id, result.id)

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