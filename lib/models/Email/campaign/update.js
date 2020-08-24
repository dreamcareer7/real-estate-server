const db     = require('../../../utils/db')

const AttachedFile = require('../../AttachedFile')
const htmlToText = require('../html-to-text')


const EmailCampaignRecipient = require('./recipient')
const EmailCampaignAttachment = require('./attachment')

const { insertAttachments } = require('./attachment/campaign')
const { validate } = require('./validate')
const { get } = require('./get')

/**
 * @param {IEmailCampaign} campaign
 */
const update = async campaign => {
  const text = campaign.text || htmlToText(campaign.html)

  await validate(campaign)

  await db.query.promise('email/campaign/update', [
    campaign.id,
    campaign.from,
    campaign.subject,
    campaign.include_signature,
    campaign.html,
    text,
    campaign.due_at,
    campaign.google_credential,
    campaign.microsoft_credential
  ])

  await EmailCampaignRecipient.insertForCampaigns([campaign])

  const old = await get(campaign.id)
  const attachments = old.attachments || []

  const toDelete = attachments.map(file => {
    return {
      file,
      role_id: campaign.id,
      role: 'EmailCampaign'
    }
  })

  await AttachedFile.unlinkMany(toDelete)
  await EmailCampaignAttachment.deleteByCampaign(campaign.id)

  const hasAttachments = campaign.attachments ? ( campaign.attachments.length > 0 ? true : false ) : false

  if (hasAttachments)
    await insertAttachments([campaign])

  return get(campaign.id)
}

module.exports = {
  update,
}
