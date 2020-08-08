const db  = require('../../../../utils/db')

const EmailCampaignAttachment = {
  ...require('./get')
}

EmailCampaignAttachment.createAll = async attachments => {
  return db.selectIds('email/campaign/attachments/insert', [JSON.stringify(attachments)])
}

EmailCampaignAttachment.deleteByCampaign = async campaignId => {
  return await db.selectIds('email/campaign/attachments/delete_by_campaing', [campaignId])
}

module.exports = EmailCampaignAttachment
