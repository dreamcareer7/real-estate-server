const config = require('../../config.js')
const queue = require('../../utils/queue.js')
const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const request = require('request')
const htmlToText = require('./html-to-text')

const Orm = require('../Orm')

const Mailgun = require('mailgun-js')

const Email = {}

Email.MARKETING = 'Marketing'
Email.GENERAL = 'General'

Email.TO = 'To'
Email.CC = 'CC'
Email.BCC = 'BCC'

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
      bcc = []
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
      headers,
      campaign
    })
  }

  const ids = await db.chunked(rows, Object.keys(rows[0]).length, (chunk, i) => {
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

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]

    email.id = ids[i]

    const { attachments = [] } = email

    const relations = attachments.map(file => {
      return {
        role: 'Email',
        role_id: email.id,
        file
      }
    })

    await AttachedFile.linkMany(relations)

    Email.queue(emails[i])
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

  email['o:tag'] = email.tags

  const recipient = email.to || email.cc || email.bcc

  try {
    const { id } = await promisify(domains[email.domain])(email)

    Context.log('Sent an email to'.cyan, recipient, email.id, id)

    await Email.storeId(email.id, id)

    return id
  } catch(err) {
    Context.log('<- (Mailgun-Transport) Error sending email to'.red, recipient, ':', JSON.stringify(err))
    throw err
  }
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

Email.publicize = model => {
  /*
   * It would make our responses huge as sometimes we send thousands of these to clients.
   */
  delete model.html
  delete model.text
}

Orm.register('email', 'Email', Email)

global['Email'] = Email
module.exports = Email
