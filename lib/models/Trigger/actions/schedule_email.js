
const EmailCampaign = {
  ...require('../../Email/campaign/get'),
  ...require('../../Email/campaign/create'),
  ...require('../../Email/campaign/update'),
}
const EmailCampaignRecipient = require('../../Email/campaign/recipient/get')

const Context = require('../../Context')
const Orm = require('../../Orm/context')

const {
  TO,
  CC,
  BCC
} = require('../../Email/constants')

const Contact = require('../../Contact/get')
const Trigger = require('../create')
const { TriggerError } = require('../error')

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 */
async function actionScheduleEmail(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new TriggerError('actionScheduleEmail called on a trigger with a different action type')
  }
  Orm.enableAssociation('email_campaign.recipients')
  const campaign = await EmailCampaign.get(trigger.campaign)

  if (campaign.executed_at) {
    throw new TriggerError(`EmailCampaign ${campaign.id} has been executed already.`)
  }

  switch (trigger.trigger_object_type) {
    case 'deal' : {
      throw new TriggerError('Invalid trigger: actionScheduleEmail does not support deal triggers yet.')
      // remember to add a break when the behavior is handled for deals
    }
    case 'contact' : {
      const contact = await Contact.get(trigger.contact)
      if (!contact.primary_email) {
        throw new TriggerError('Contact does not have an email')
      }
      campaign.due_at = new Date(trigger.timestamp * 1000).toISOString()
      campaign.to = [{
        email: contact.primary_email,
        contact: contact.id,
        recipient_type: 'Email',
      }]

      await EmailCampaign.update(campaign)

      Context.log(`EmailCampaign "${campaign.id}" attached to ${trigger.event_type} trigger "${trigger.id}" was scheduled for "${campaign.due_at}".`)
      break
    }
    default: {
      await EmailCampaign.update({...campaign, due_at: new Date(trigger.timestamp * 1000).toISOString()})
    }
  }
}

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 * @returns {Promise<UUID | null>}
 */
async function clone(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new TriggerError('clone called on a trigger with an action type other than `schedule_email`')
  }

  Orm.enableAssociation('email_campaign.recipients')
  const campaign = await EmailCampaign.get(trigger.campaign)

  /** @type {IEmailCampaignRecipient[]} */
  const recipients = await EmailCampaignRecipient.getAll(campaign.recipients)

  const [cloned_campaign] = await EmailCampaign.createMany([{
    brand: trigger.brand,
    created_by: trigger.created_by,
    due_at: null,
    from: campaign.from,
    to: recipients.filter(r => r.send_type === TO),
    cc: recipients.filter(r => r.send_type === CC),
    bcc: recipients.filter(r => r.send_type === BCC),
    subject: campaign.subject,
    html: '',
    template: campaign.template,
  }])

  Context.log(`EmailCampaign "${cloned_campaign}" was cloned from "${campaign.id}"`)

  const effective_at = new Date((trigger.timestamp - trigger.wait_for + 1 * 86400) * 1000).toISOString()
  const [created] = await Trigger.create([{
    ...trigger,
    effective_at,
    campaign: cloned_campaign,
    scheduled_after: trigger.id
  }])

  return created
}

module.exports = {
  actionScheduleEmail,
  clone,
}
