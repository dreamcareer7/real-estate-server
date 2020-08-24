const db  = require('../../../../utils/db')

const createAll = async attachments => {
  return db.selectIds('email/campaign/attachments/insert', [JSON.stringify(attachments)])
}

const deleteByCampaign = async campaignId => {
  return await db.selectIds('email/campaign/attachments/delete_by_campaing', [campaignId])
}

const EmailCampaignAttachment = {
  ...require('./get'),
  createAll,
  deleteByCampaign,
}

module.exports = EmailCampaignAttachment
