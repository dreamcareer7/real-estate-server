const db     = require('../../../utils/db')

const AttachedFile = require('../../AttachedFile')
const htmlToText = require('../html-to-text')


const EmailCampaignRecipient = require('./recipient')
const EmailCampaignAttachment = require('./attachment')

const { insertAttachments } = require('./attachment/campaign')
const TemplateInstance = require('../../Template/instance/get')
const Template = require('../../Template/get')

const { validate } = require('./validate')
const { get } = require('./get')
const Mjml = require('./mjml')

/**
 * @param {IEmailCampaign} campaign
 */
const update = async campaign => {
  const text = campaign.text || htmlToText(campaign.html)

  let html = campaign.html

  if (campaign.template) {
    const instance = await TemplateInstance.get(campaign.template)
    const template = await Template.get(instance.template)
    const { mjml } = template

    if (mjml)
      html = Mjml(html)
  }

  await validate(campaign)

  await db.query.promise('email/campaign/update', [
    campaign.id,
    campaign.from,
    campaign.subject,
    campaign.include_signature,
    html,
    text,
    campaign.due_at,
    campaign.google_credential,
    campaign.microsoft_credential,
    campaign.event_notifications
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
