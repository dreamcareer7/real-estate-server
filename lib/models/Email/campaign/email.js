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

EmailCampaignEmail.saveError = async (email, ex) => {
  const viaMicrosoft = Boolean(email.microsoft_credential) 
  const viaGoogle    = Boolean(email.google_credential)
  const viaMailgun   = !viaMicrosoft && !viaGoogle

  const service    = !viaMailgun ? ( viaMicrosoft ? 'Outlook' : 'Gmail' ) : 'Mailgun'
  const credential = !viaMailgun ? ( viaMicrosoft ? email.microsoft_credential : email.google_credential ) : null

  const text = `${service}-Send-Email-Failed - email: ${email.id} - credential: ${credential} - Ex: ${ex.message}`
  const msg  = `${service}-Send-Email-Failed Ex: ${JSON.stringify(ex)}`

  Context.log(msg)

  Slack.send({ channel: '7-server-errors',  text: text, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: text, emoji: ':skull:' })

  return db.update('email/campaign/email/error', [email.id, ex.message])
}

EmailCampaignEmail.associations = {
  email: {
    model: 'Email',
    enabled: false
  }
}


Orm.register('email_campaign_email', 'EmailCampaignEmail', EmailCampaignEmail)

module.exports = EmailCampaignEmail
