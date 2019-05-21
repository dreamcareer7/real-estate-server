const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const Orm = require('../../Orm')

const EmailCampaignEmail = {}
global['EmailCampaignEmail'] = EmailCampaignEmail

EmailCampaignEmail.createAll = async rows => {
  if (!Array.isArray(rows) || rows.length < 1) return []

  const q = sq
    .insert({
      autoQuoteFieldNames: true,
      nameQuoteCharacter: '"'
    })
    .into('email_campaign_emails')
    .returning('id')

  // @ts-ignore
  q.name = 'email/campaign/emails'

  q.setFieldsRows(rows)

  await db.selectIds(q, [])
}

EmailCampaignEmail.getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
}

Orm.register('email_campaign_email', 'EmailCampaignEmail', EmailCampaignEmail)

module.exports = EmailCampaignEmail
