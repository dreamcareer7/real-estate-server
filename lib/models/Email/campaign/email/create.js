const sq = require('../../../../utils/squel_extensions')
const db = require('../../../../utils/db')
const Context = require('../../../Context')
const Slack = require('../../../Slack')

const createAll = async rows => {
  if (!Array.isArray(rows) || rows.length < 1) return []

  Context.log('Inserting', rows.length)
  return db.chunked(rows, Object.keys(rows[0]).length, (chunk, i) => {
    Context.log('Inserted', rows.length)
    const q = sq
      .insert({
        autoQuoteFieldNames: true,
        nameQuoteCharacter: '"'
      })
      .into('email_campaign_emails')
      .setFieldsRows(chunk)
      .returning('id')

    // @ts-ignore
    q.name = `email/campaign/insert_emails#${i}`

    return db.selectIds(q)
  })
}

const saveError = async (email, err) => {
  const text = `Failed to send email ${email.id}, ${err.message}`

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })

  Context.log(`Failed to send email ${email.id}`, err)

  return db.update('email/campaign/email/error', [email.id, err.message])
}

module.exports = { createAll, saveError }
