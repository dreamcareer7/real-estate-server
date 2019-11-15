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

EmailCampaignAttachment.createAll = async rows => {
  if (!Array.isArray(rows) || rows.length < 1) return []

  Context.log('Inserting EmailCampaignAttachment', rows.length)

  return db.chunked(rows, Object.keys(rows[0]).length, (chunk, i) => {
    Context.log('Inserted EmailCampaignAttachment', rows.length)

    const q = squel      
      .insert()
      .into('email_campaign_attachments')
      .setFieldsRows(chunk)
      .returning('id')

    // @ts-ignore
    q.name = `email/campaign/insert_attachments#${i}`

    return db.selectIds(q)
  })
}

EmailCampaignAttachment.deleteByCampaign = async (emailCampaignId) => {
  return db.update('email/campaign/attachments/delete_by_campaing', [emailCampaignId])
}



Orm.register('email_campaign_attachment', 'EmailCampaignAttachment', EmailCampaignAttachment)

module.exports = EmailCampaignAttachment