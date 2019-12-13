const config = require('../../config.js')
const { peanar } = require('../../utils/peanar')
const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const request = require('request')
const htmlToText = require('./html-to-text')

const gmailSender = require('./senders/gmail')
const outlookSender = require('./senders/outlook')
const EmailCampaignEmail = require('./campaign/email')

const Context = require('../Context')
const Orm = require('../Orm')

const Mailgun = require('mailgun-js')

const Email = {}

/** @type {'Marketing'} */
Email.MARKETING = 'Marketing'

/** @type {'General'} */
Email.GENERAL = 'General'

/** @type {'To'} */
Email.TO = 'To'

/** @type {'CC'} */
Email.CC = 'CC'

/** @type {'BCC'} */
Email.BCC = 'BCC'

/** @type {'Tag'} */
Email.TAG = 'Tag'

/** @type {'List'} */
Email.LIST = 'List'

/** @type {'Email'} */
Email.EMAIL = 'Email'

/** @type {'Brand'} */
Email.BRAND = 'Brand'

/** @type {'AllContacts'} */
Email.ALL_CONTACTS = 'AllContacts'

const senders = {}

const mock = require('./mock')

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
domains[Email.GENERAL] = factory(Email.GENERAL)
domains[Email.MARKETING] = factory(Email.MARKETING)



const sendViaGmail = async email => {
  const message = await gmailSender(email)

  await Email.storeGoogleId(email.id, message.message_id)
  await EmailCampaign.saveThreadKey(email.campaign, `${email.google_credential}${message.thread_id}`)
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

  email['o:tag'] = email.tags

  const { id } = await promisify(domains[email.domain])(email)

  await Email.storeId(email.id, id)

  return id
}

const sendEmail = async email => {
  const recipient    = email.to || email.cc || email.bcc
  const viaMicrosoft = Boolean(email.microsoft_credential) 
  const viaGoogle    = Boolean(email.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  try {

    if(viaMicrosoft)
      await outlookSender(email)

    if(viaGoogle)
      await sendViaGmail(email)

    if(viaMailgun)
      await sendViaMailgun(email)

    Context.log('Sent an email message'.cyan, recipient, email.id)

  } catch (err) {

    await EmailCampaignEmail.saveError(email, err)
  }
}



Email.create = async email => {
  const ids = await Email.createAll([email])

  return Email.get(ids[0])
}

Email.createAll = async emails => {
  if (!Array.isArray(emails) || emails.length === 0) return []

  const rows = []

  for (const email of emails) {
    if (!email.domain) email.domain = Email.GENERAL
    if (!email.from) email.from = config.email.from

    const {
      domain,
      tags = [],
      from,
      campaign,
      html,
      subject,
      headers,
      to = [],
      cc = [],
      bcc = [],
      tracking_id
    } = email

    let { text } = email

    if (!text)
      text = htmlToText(email.html)

    rows.push({
      domain,
      from,
      tags: sq.SqArray.from(tags || []),
      to: sq.SqArray.from(to || []),
      cc: sq.SqArray.from(cc || []),
      bcc: sq.SqArray.from(bcc || []),
      subject,
      html,
      text,
      headers: sq.SqArray.from(headers || []),
      campaign,
      tracking_id
    })
  }

  const ids = await db.chunked(rows, Object.keys(rows[0]).length * 2, (chunk, i) => {
    const q = sq
      .insert({
        autoQuoteFieldNames: true,
        nameQuoteCharacter: '"'
      })
      .into('emails')
      .setFieldsRows(chunk)
      .returning('id')

    q.name = `email/create_all#${i}`

    return db.selectIds(q)
  })

  Context.log(`Inserting ${ids.length} of ${emails.length} is done`)

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]

    email.id = ids[i]

    const viaMicrosoft = Boolean(email.microsoft_credential) 
    const viaGoogle    = Boolean(email.google_credential)
    const viaMailgun   = !viaMicrosoft && !viaGoogle

    Email.queue(emails[i], !viaMailgun)
  }

  return ids
}

Email.getAll = async ids => {
  return db.select('email/get', [ids])
}

Email.get = async id => {
  const emails = await Email.getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Email ${id} not found`)

  return emails[0]
}

Email.storeId = async (id, mailgun_id) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store-id', [id, trimmed])
}

Email.storeGoogleId = async (id, google_id) => {
  await db.query.promise('email/store_google_id', [id, google_id])
}

Email.storeMicrosoftId = async (id, microsoft_id) => {
  await db.query.promise('email/store_microsoft_id', [id, microsoft_id])
}

Email.addEvent = async ({email, event, created_at, recipient}) => {
  Context.log('Adding email event', event, recipient, email)
  const { rows } = await db.query.promise('email/event/add', [
    email,
    event,
    created_at,
    recipient
  ])

  const { campaign } = rows[0]

  if (campaign)
    return EmailCampaign.touch(campaign)
}

Email.publicize = (model, { select }) => {
  /*
   * It would make our responses huge as sometimes we send thousands of these to clients.
   */
  const email = select.email
  if (!Array.isArray(email) || !email.includes('html')) delete model.html
  if (!Array.isArray(email) || !email.includes('text')) delete model.text
}

Email.queue = async (email, highPriority = false) => {
  Context.log('Queueing email to', email.to)

  if (highPriority) {
    Email.highPriority(email)
  } else {
    Email.lowPriority(email)
  }
}

Email.lowPriority = peanar.job({
  handler: sendEmail,
  queue: 'email',
  error_exchange: 'email.error',
  exchange: 'email',
  name: 'sendEmail'
})

Email.highPriority = peanar.job({
  handler: sendEmail,
  queue: 'email_high',
  error_exchange: 'email.error',
  exchange: 'email',
  name: 'sendEmail'
})


Orm.register('email', 'Email', Email)

global['Email'] = Email

module.exports = Email
