const squel   = require('../../../utils/squel_extensions')
const db      = require('../../../utils/db')
const Orm     = require('../../Orm')
const Context = require('../../Context/index')


const EmailCampaignAttachment = {}

global['EmailCampaignAttachment'] = EmailCampaignAttachment


EmailCampaignAttachment.getAll = async ids => {
  return db.select('email/campaign/attachments/get', [ids])
}

EmailCampaignAttachment.getByCampaign = async emailCampaignId => {
  const ids = db.select('email/campaign/attachments/get_by_campaing', [emailCampaignId])

  return EmailCampaignAttachment.getAll(ids)
}

EmailCampaignAttachment.createAll = async attachments => {
  return db.selectIds('email/campaign/attachments/insert', [JSON.stringify(attachments)])
}

EmailCampaignAttachment.deleteByCampaign = async (emailCampaignId) => {
  return db.update('email/campaign/attachments/delete_by_campaing', [emailCampaignId])
}



Orm.register('email_campaign_attachment', 'EmailCampaignAttachment', EmailCampaignAttachment)

module.exports = EmailCampaignAttachment