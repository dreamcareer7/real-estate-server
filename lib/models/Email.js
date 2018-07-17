const config = require('../config.js')
const queue = require('../utils/queue.js')
const db = require('../utils/db')
const promisify = require('../utils/promisify')

const mailgun = require('mailgun-js')({apiKey: config.mailgun.api_key, domain: config.mailgun.domain})

let send_mailgun

if (process.env.NODE_ENV === 'tests') {
  send_mailgun = (params, cb) => cb(null, 'example-mailgun-id')
} else {
  const messages = mailgun.messages()
  send_mailgun = messages.send.bind(messages)
}

const Email = {}

Email.create = async email => {
  const { from, to, subject, html, text, headers } = email

  const res = await db.query.promise('email/insert', [
    from,
    [to],
    subject,
    html,
    text,
    headers
  ])

  const id = res.rows[0].id
  email.id = id

  Email.queue(email, () => {}) // Queue for sending

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
  process.domain.jobs.push(queue.create('email', email).removeOnComplete(true))
}

Email.storeId = async (id, mailgun_id) => {
  await db.query.promise('email/store-id', [id, mailgun_id])
}

Email.send = async email => {
  const params = {
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.mailgun_options
  }

  const mailgun_options = email.headers

  if (mailgun_options)
    for (const i in mailgun_options)
      params[i] = mailgun_options[i]

  try {
    const { id } = await promisify(send_mailgun)(params)
    console.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    console.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err))
    throw err
  }

}

global['Email'] = Email
module.exports = Email
