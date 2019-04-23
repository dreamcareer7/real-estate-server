const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

EmailCampaignEmail = {}
global['EmailCampaignEmail'] = EmailCampaignEmail

EmailCampaignEmail.createAll = async rows => {
  const q = sq
    .insert({
      autoQuoteFieldNames: true,
      nameQuoteCharacter: '"'
    })
    .into('email_campaign_emails')
    .returning('id')

  q.name = 'email/campaign/emails'

  q.setFieldsRows(rows)

  await db.selectIds(q, [])
}

EmailCampaignEmail.getAll = async ids => {
  return db.select('email/campaign/email/get', [ids])
}

EmailCampaignEmail.associations = {
  email: {
    model: 'Email'
  }
}

Orm.register('email_campaign_email', 'EmailCampaignEmail', EmailCampaignEmail)
