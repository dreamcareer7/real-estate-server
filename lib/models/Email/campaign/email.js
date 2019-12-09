const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Context = require('../../Context')
const Orm = require('../../Orm')
const Slack = require('../../Slack')

const EmailCampaignEmail = {}
global['EmailCampaignEmail'] = EmailCampaignEmail


EmailCampaignEmail.createAll = async rows => {
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

EmailCampaignEmail.getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
}

EmailCampaignEmail.get = async id => {
  const emails = await EmailCampaignEmail.getAll([id])

  if (emails.length < 1)
    throw Error.ResourceNotFound(`Campaign email ${id} not found`)

  return emails[0]
}

EmailCampaignEmail.saveError = async (email, err) => {
  const text = `Failed to send email ${email.id}`

  Slack.send({ channel: '7-server-errors',  text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text, emoji: ':skull:' })

  Context.log(`Failed-to-send-email - Email: ${email.id}, Ex: ${err}`)

  return db.update('email/campaign/email/error', [email.id, err.message])
}

EmailCampaignEmail.associations = {
  email: {
    model: 'Email',
    enabled: false
  }
}


Orm.register('email_campaign_email', 'EmailCampaignEmail', EmailCampaignEmail)

module.exports = EmailCampaignEmail
