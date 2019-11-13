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
      .into('email_campaign_emails')
      .setFieldsRows(chunk)
      .onConflict(['email_campaign', 'att_id'], {
        google_credential: squel.rstr('EXCLUDED.google_credential'),
        microsoft_credential: squel.rstr('EXCLUDED.microsoft_credential'),
        file_name: squel.rstr('EXCLUDED.file_name'),
        link: squel.rstr('EXCLUDED.link'),
        type: squel.rstr('EXCLUDED.type'),
        is_inline: squel.rstr('EXCLUDED.is_inline'),
        content_id: squel.rstr('EXCLUDED.content_id'),
        updated_at: squel.rstr('now()')
      })

      .returning('id')

    // @ts-ignore
    q.name = `email/campaign/insert_attachments#${i}`

    return db.selectIds(q)
  })
}

GoogleCredential.deleteByCampaign = async (emailCampaignId) => {
  return db.update('email/campaign/attachments/delete_by_campaing', [emailCampaignId])
}



Orm.register('email_campaign_email', 'EmailCampaignAttachment', EmailCampaignAttachment)

module.exports = EmailCampaignAttachment