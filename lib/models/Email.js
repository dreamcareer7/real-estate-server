const config = require('../config.js')
const queue = require('../utils/queue.js')
const sq = require('../utils/squel_extensions')
const db = require('../utils/db')
const promisify = require('../utils/promisify')
const Context = require('./Context')
const htmlToText = require('html-to-text')
const request = require('request')

const Mailgun = require('mailgun-js')

const Email = {}

Email.MARKETING = 'Marketing'
Email.GENERAL = 'General'

let mg_id_counter = 1

const senders = {}

const instance = sender => {
  if (senders[sender])
    return senders[sender]

  const c = config.mailgun[sender]
  const mailgun = Mailgun({apiKey: c.api_key, domain: c.domain})
  senders[sender] = mailgun

  return mailgun
}

const factory = sender => {
  if (process.env.NODE_ENV === 'tests')
    return (params, cb) => cb(null, { id: `example-mailgun-id-${mg_id_counter++}` })

  const mailgun = instance(sender)
  const messages = mailgun.messages()

  return messages.send.bind(messages)
}

const domains = {}
domains[Email.GENERAL] = factory(Email.GENERAL)
domains[Email.MARKETING] = factory(Email.MARKETING)


Email.create = async email => {
  if (!email.domain)
    email.domain = Email.GENERAL

  if (!email.from)
    email.from = config.email.from

  if (!email.text)
    email.text = htmlToText.fromString(email.html, {
      ignoreImage: true,
      wordwrap: 130
    })

  const { from, to, subject, html, text, headers, domain, campaign, attachments = [] } = email

  const id = await db.insert('email/insert', [
    domain,
    from,
    [to],
    subject,
    html,
    text,
    headers,
    campaign
  ])

  email.id = id

  for(const attachment of attachments) {
    await promisify(AttachedFile.link)(attachment, {
      role: 'Email',
      id: email.id
    })
  }

  Email.queue(email) // Queue for sending

  return Email.get(id)
}

Email.createAll = async emails => {
  if (!Array.isArray(emails) || emails.length === 0) return []

  const q = sq
    .insert({
      autoQuoteFieldNames: true,
      nameQuoteCharacter: '"'
    })
    .into('emails')
    .returning('id')

  q.name = 'email/create_all'

  const rows = []

  for (const email of emails) {
    const {
      domain = Email.GENERAL,
      from = config.email.from,
      campaign,
      html,
      subject,
      headers
    } = email

    let {
      to,
      text
    } = email

    to = to ? new sq.SqArray(email.to) : new sq.SqArray()

    if (!text)
      text = htmlToText.fromString(email.html, {
        ignoreImage: true,
        wordwrap: 130
      })

    rows.push({
      domain,
      from,
      to,
      subject,
      html,
      text,
      headers,
      campaign
    })
  }

  q.setFieldsRows(rows)

  const ids = await db.selectIds(q, [])
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]

    email.id = ids[i]

    const { attachments = [] } = email

    for(const attachment of attachments) {
      await promisify(AttachedFile.link)(attachment, {
        role: 'Email',
        id: email.id
      })
    }

    Email.queue(emails[i])
  }

  return ids
}

Email.getAll = ids => {
  return db.select('email/get', [ids])
}

Email.get = async id => {
  const emails = await Email.getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Email ${id} not found`)

  return emails[0]
}

Email.queue = async email => {
  Context.get('jobs').push(queue.create('email', email).removeOnComplete(true))
}

Email.storeId = async (id, mailgun_id) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store-id', [id, trimmed])
}

Email.send = async email => {
  const { attachments = [] } = email

  const files = await AttachedFile.getAll(attachments)

  const mailgun = instance(email.domain)

  email.attachment = files.map(attachment => {
    return new mailgun.Attachment({
      filename: attachment.name,
      data: request(attachment.url)
    })
  })

  try {
    const { id } = await promisify(domains[email.domain])(email)
    Context.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    Context.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err))
    throw err
  }
}

Email.addEvent = async ({email, event, created_at, recipient}) => {
  await db.query.promise('email/event/add', [
    email,
    event,
    created_at,
    recipient
  ])
}

global['Email'] = Email
module.exports = Email
