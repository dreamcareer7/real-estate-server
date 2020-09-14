const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db')
const config = require('../../config.js')
const Context = require('../Context')

const htmlToText = require('./html-to-text')
const { get } = require('./get')

const { GENERAL } = require('./constants')
const { queue } = require('./send')

const createAll = async emails => {
  if (!Array.isArray(emails) || emails.length === 0) return []

  const rows = []

  for (const email of emails) {
    if (!email.domain) email.domain = GENERAL
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
      tracking_id,
      google_credential,
      microsoft_credential,
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
      headers: JSON.stringify(headers || []),
      campaign,
      tracking_id,
      google_credential: google_credential || null,
      microsoft_credential: microsoft_credential || null,
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

    queue(ids[i], !viaMailgun)
  }

  return ids
}

const create = async email => {
  const ids = await createAll([email])

  return get(ids[0])
}

module.exports = { createAll, create }
