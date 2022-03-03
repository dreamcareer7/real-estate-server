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

const archive = require('./archive/upload')
const mock = require('./mock')
const { get } = require('./get')
const { dateToEpoch } = require('../../utils/belt')

const {
  storeGoogleInfo,
  storeMailgunResponse
} = require('./store')

const instance = (domain) => {
  if (process.env.NODE_ENV === 'tests')
    return mock

  if (senders[domain])
    return senders[domain]

  const mailgun = Mailgun({
    apiKey: config.mailgun.api_key,
    domain
  })
  senders[domain] = mailgun

  return mailgun
}


const sendViaGmail = async email => {
  const message = await gmailSender(email)

  const nowInUnix = dateToEpoch(new Date())

  await storeGoogleInfo({emailID: email.id, google_id: message.message_id, sent_at: nowInUnix})
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


  /* 
   * Oh boy. Where do I begin.
   * Let's say we have a user: john@realty.com.
   * Mailgun will send an email on his behalf using the domain mail.rechat.com
   * This means it will fail the DMARC test because realty.com and mail.rechat.com are not the same. 
   * Therefore, in the "From" section, gmail will say:
   * John Smith (Via mail.rechat.com)
   *
   * To resolve this issue (and also achieve better deliverability) we introduced the ability to set a custom mailgun instance
   * for each domain. So, if the brand sends emails using their own custom mailgun instance, the email will be sent
   * from "john@rechat-mail.realty.com", and thus, pass the DMARC test.
   * This makes GMail happy and it wont show the "Via mail.rechat.com" anymore.
   *
   * Fuck Microsoft. Because again, they break a perfectly well logic.
   *
   * In the email protocol, if the person sending the email is different from the "From" field, they need to define
   * a "Sender" header. And mailgun automatically sets this header.
   * Outlook (At least on web, as of June 2021), doesn't care about DMARC alignment. It just compares the "from" and "Sender" headers.
   * If they fail, it displays this: "emilsedgh=kde.org@alpine.rechat.com on behalf of emilsedgh@kde.org"
   * It's god damn unbelievable how this company operates and sells so much. Sales teams at Google must all be fired.
   * In order to satisfy Microsoft Outlook on Web, so it doesn't look this ugly and thus make our clients panic,
   * we will set Sender header, which is exactly the "From" field, so they become the same.
   *
   * This strategy is not really recommended by Mailgun, but we're trying it out anyways. Here's the full discussion
   * we have about it with Mailgun: https://app.mailgun.com/app/support/view/1679168
   * 
   * Apparently strict implementations of dmarc can reject such emails though. Therefore, we only apply this only if there's a custom
   * domain involved, which means we expect the email to be dmarc aligned.
  */
  if (email.domain !== config.mailgun.domain)
    email['h:Sender'] = email.from


  if (email.headers) {
    for(const name in email.headers) {
      email[`h:${name}`] = email.headers[name]
    }
  }

  delete email.headers
  delete email.attachments

  email['o:tag'] = email.tags

  const messages = mailgun.messages()
  const { id } = await promisify(messages.send.bind(messages))(email)

  /*
    JavaScript Date.now().getTime() returns the number of milliseconds 
    since the Unix Epoch (1 Jan 1970). PostgreSQL to_timestamp(…) 
    converts a single argument, interpreted as the number of seconds 
    since the Unix Epoch into a PosgtreSQL timestamp. 
    At some point, the JavaScript value needs to be divided by 1000.     
  */
  const nowInUnix = dateToEpoch(new Date())

  await storeMailgunResponse({emailID: email.id, mailgun_id: id, sent_at: nowInUnix})

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

    // archive the contents in S3 and clear from the database
    archive(email.id).catch(ex => {
      console.error(`Unable to enqueue email archive job for ${email.id}`, ex)
    })
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
