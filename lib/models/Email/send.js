const Mailgun = require('mailgun-js')
const request = require('request')

const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')

const Context = require('../Context')

const { saveThreadKey } = require('./campaign/save')
const EmailCampaignEmail = require('./campaign/email')

const promisify = require('../../utils/promisify')

const senders = {}

const { gmailSender }    = require('./senders/gmail')
const { outlookSender }  = require('./senders/outlook')

const mock = require('./mock')

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

const sendEmail = async email => {
  const recipient    = email.to || email.cc || email.bcc
  const viaMicrosoft = Boolean(email.microsoft_credential)
  const viaGoogle    = Boolean(email.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  try {

    if (viaMicrosoft)
      await outlookSender(email)

    if (viaGoogle)
      await sendViaGmail(email)

    if (viaMailgun)
      await sendViaMailgun(email)

    Context.log('Sent an email message'.cyan, recipient, email.id)

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

const queue = async (email, highPriority = false) => {
  Context.log('Queueing email to', email.to)

  if (highPriority) {
    highPriority(email)
  } else {
    lowPriority(email)
  }
}

const lowPriority = peanar.job({
  handler: sendEmail,
  queue: 'email',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

const highPriority = peanar.job({
  handler: sendEmail,
  queue: 'email_high',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

module.exports = { queue, lowPriority, highPriority }
