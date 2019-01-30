const _ = require('lodash')
const config = require('../config.js')
const queue = require('../utils/queue.js')
const sq = require('../utils/squel_extensions')
const db = require('../utils/db')
const promisify = require('../utils/promisify')
const Context = require('./Context')
const htmlToText = require('html-to-text')

const Mailgun = require('mailgun-js')

const Email = {}

Email.MARKETING = 'Marketing'
Email.GENERAL = 'General'

let mg_id_counter = 1

const factory = sender => {
  if (process.env.NODE_ENV === 'tests')
    return (params, cb) => cb(null, { id: `example-mailgun-id-${mg_id_counter++}` })

  const c = config.mailgun[sender]
  const mailgun = Mailgun({apiKey: c.api_key, domain: c.domain})
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

  const { from, to, subject, html, text, headers, domain } = email

  const id = await db.insert('email/insert', [
    domain,
    from,
    [to],
    subject,
    html,
    text,
    headers
  ])

  email.id = id

  Email.queue(email) // Queue for sending

  return Email.get(id)
}

Email.createAll = async emails => {
  if (!Array.isArray(emails) || emails.length === 0) return []

  const fields = ['domain', 'from', 'to', 'subject', 'html', 'text', 'headers']

  for (const email of emails) {
    if (!email.domain) email.domain = Email.GENERAL
    if (!email.from) email.from = config.email.from
    if (!email.to) {
      email.to = new sq.SqArray()
    }
    else {
      email.to = new sq.SqArray(email.to)
    }

    if (!email.text)
      email.text = htmlToText.fromString(email.html, {
        ignoreImage: true,
        wordwrap: 130
      })

    for (const k of fields) {
      if (email[k] === undefined) email[k] = null
    }
  }

  const q = sq.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
    .into('emails')
    .setFieldsRows(emails.map(e => _.pick(e, fields)))
    .returning('id')

  q.name = 'email/create_all'

  const ids = await db.selectIds(q, [])
  
  for (let i = 0; i < emails.length; i++) {
    emails[i].id = ids[i]
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
