const { keyBy } = require('lodash')

const Mailgun = require('mailgun-js')
const request = require('request')

const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')

const Context = require('../Context')

const { saveThreadKey } = require('./campaign/thread')
const EmailCampaignEmail = require('./campaign/email')
const EmailCampaignAttachment = require('./campaign/attachment')
const AttachedFile = require('../AttachedFile')

const promisify = require('../../utils/promisify')

const senders = {}

const { gmailSender }    = require('./senders/gmail')
const { outlookSender }  = require('./senders/outlook')

const mock = require('./mock')
const { get } = require('./get')

const {
  GENERAL,
  MARKETING
} = require('./constants')

const {
  storeGoogleId,
  storeId
} = require('./store')

const instance = sender => {
  if (process.env.NODE_ENV === 'tests')
    return mock

  if (senders[sender])
    return senders[sender]

  const c = config.mailgun[sender]
  const mailgun = Mailgun({apiKey: c.api_key, domain: c.domain})
  senders[sender] = mailgun

  return mailgun
}

const factory = sender => {
  const mailgun = instance(sender)
  const messages = mailgun.messages()
  return messages.send.bind(messages)
}

const domains = {}
domains[GENERAL] = factory(GENERAL)
domains[MARKETING] = factory(MARKETING)



const sendViaGmail = async email => {
  const message = await gmailSender(email)

  await storeGoogleId(email.id, message.message_id)
  await saveThreadKey(email.campaign, `${email.google_credential}${message.thread_id}`)
}

const sendViaMailgun = async email => {
  const mailgun = instance(email.domain)

  if (email.attachments) {
    email.attachment = email.attachments.map(attachment => {
      return new mailgun.Attachment({
        filename: attachment.name || '',
        data: request(attachment.url)
      })
    })
  }

  if (email.headers) {
    for(const name in email.headers) {
      email[`h:${name}`] = email.headers[name]
    }
  }

  delete email.headers
  delete email.attachments

  email['o:tag'] = email.tags

  const { id } = await promisify(domains[email.domain])(email)

  await storeId(email.id, id)

  return id
}

/**
 * @param {UUID} id 
 */
const sendEmail = async (id) => {
  const email = await get(id)

  const attachments = await EmailCampaignAttachment.getByCampaign(email.campaign)

  email.attachments = []

  if ( attachments.length ) {
    const ids   = attachments.map(att => att.file)
    const files = await AttachedFile.getAll(ids)
  
    const filesById = keyBy(files, 'id')
  
    const populated = attachments.map(attachment => {
      return {
        ...attachment,
        ...filesById[attachment.file]
      }
    })
  
    email.attachments = populated
  }

  const recipient    = email.to || email.cc || email.bcc
  const viaMicrosoft = Boolean(email.microsoft_credential)
  const viaGoogle    = Boolean(email.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  try {
    // This is where we "almost" eliminate the possibility
    // of sending an email twice.
    if (
      (viaGoogle && email.google_id) ||
      (viaMicrosoft && email.microsoft_id) ||
      (viaMailgun && email.mailgun_id)
    ) {
      return Context.log('Email has been sent already!')
    }

    if (viaMicrosoft) {
      await outlookSender(email)
      Context.log('Sent an email message'.cyan, recipient, email.id, 'via Outlook')
    }

    if (viaGoogle) {
      await sendViaGmail(email)
      Context.log('Sent an email message'.cyan, recipient, email.id, 'via Gmail')
    }

    if (viaMailgun) {
      await sendViaMailgun(email)
      Context.log('Sent an email message'.cyan, recipient, email.id, 'via Mailgun')
    }

  } catch (err) {

    if (viaMicrosoft) {
      if (err.message === 'rate-limit-exceed') {
        Context.log('outlook-rate-limit-exceed', email.id)
        throw err
      } else {
        Context.log('outlook-send-failed', email.id, err.message, err)
      }
    }

    await EmailCampaignEmail.saveError(email, err)
  }
}

/**
 * @param {UUID} email 
 * @param {boolean} highPriority 
 */
const queue = async (email, highPriority = false) => {
  if (highPriority) {
    sendHighPriority(email)
  } else {
    sendLowPriority(email)
  }
}

const sendLowPriority = peanar.job({
  handler: sendEmail,
  queue: 'email',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

const sendHighPriority = peanar.job({
  handler: sendEmail,
  queue: 'email_high',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

module.exports = { queue, lowPriority: sendLowPriority, highPriority: sendHighPriority }
