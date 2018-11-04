const config = require('../config.js')
const queue = require('../utils/queue.js')
const db = require('../utils/db')
const promisify = require('../utils/promisify')

const Mailgun = require('mailgun-js')

const Email = {}

Email.MARKETING = 'Marketing'
Email.GENERAL = 'General'

const factory = sender => {
  if (process.env.NODE_ENV === 'tests')
    return (params, cb) => cb(null, 'example-mailgun-id')

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

  const { from, to, subject, html, text, headers, domain } = email

  const res = await db.query.promise('email/insert', [
    domain,
    from,
    [to],
    subject,
    html,
    text,
    headers
  ])

  const id = res.rows[0].id
  email.id = id

  Email.queue(email) // Queue for sending

  return Email.get(id)
}

Email.getAll = async ids => {
  const res = await db.query.promise('email/get', [ids])
  return res.rows
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
    console.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    console.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err))
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
