const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Orm = require('../../Orm')

const EmailCampaignEmail = {}
global['EmailCampaignEmail'] = EmailCampaignEmail

EmailCampaignEmail.createAll = async rows => {
  if (!Array.isArray(rows) || rows.length < 1) return []

  return db.chunked(rows, Object.keys(rows[0]).length, (chunk, i) => {
    const q = sq
      .insert({
        autoQuoteFieldNames: true,
        nameQuoteCharacter: '"'
      })
      .into('email_campaign_emails')
      .setFieldsRows(chunk)
      .returning('id')

    // @ts-ignore
    q.name = `email/campaign/emails#${i}`

    return db.selectIds(q)
  })
}

EmailCampaignEmail.getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
}

Orm.register('email_campaign_email', 'EmailCampaignEmail', EmailCampaignEmail)

module.exports = EmailCampaignEmail
