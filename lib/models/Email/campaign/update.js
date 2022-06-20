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
  if (campaign.template) {
    const instance = await TemplateInstance.get(campaign.template)
    const template = await Template.get(instance.template)
    const { html } = instance
    const { mjml } = template

    campaign.html = mjml ? Mjml(html) : html
  }

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
    campaign.microsoft_credential,
    campaign.notifications_enabled,
    campaign.template,
    campaign.individual,
    campaign.tags
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

/**
 * @param {UUID} campaign 
 * @param {number | null} due_at 
 */
const scheduleAt = async (campaign, due_at) => {
  await db.update('email/campaign/schedule_at', [ campaign, due_at ])
}

const enableDisableNotification = async (campaign, status) => {
  await db.query.promise('email/campaign/notifications_enabled', [campaign, status])
}

module.exports = {
  update,
  scheduleAt,
  enableDisableNotification
}
