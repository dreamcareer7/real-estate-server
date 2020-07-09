const db  = require('../../../utils/db')
const Orm = require('../../Orm')


const EmailCampaignAttachment = {}

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

EmailCampaignAttachment.deleteByCampaign = async campaignId => {
  return await db.selectIds('email/campaign/attachments/delete_by_campaing', [campaignId])
}

EmailCampaignAttachment.associations = {
  file: {
    model: 'AttachedFile',
    enabled: true
  }
}

Orm.register('email_campaign_attachment', 'EmailCampaignAttachment', EmailCampaignAttachment)

module.exports = EmailCampaignAttachment
