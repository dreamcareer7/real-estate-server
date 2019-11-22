const db  = require('../../../utils/db')
const Orm = require('../../Orm')


const EmailCampaignAttachment = {}

global['EmailCampaignAttachment'] = EmailCampaignAttachment


EmailCampaignAttachment.getAll = async ids => {
  return db.select('email/campaign/attachments/get', [ids])
}

EmailCampaignAttachment.getByCampaign = async campaignId => {
  const ids = await db.selectIds('email/campaign/attachments/get_by_campaing', [campaignId])

  return EmailCampaignAttachment.getAll(ids)
}

EmailCampaignAttachment.createAll = async attachments => {
  return db.selectIds('email/campaign/attachments/insert', [JSON.stringify(attachments)])
}


Orm.register('email_campaign_attachment', 'EmailCampaignAttachment', EmailCampaignAttachment)

module.exports = EmailCampaignAttachment