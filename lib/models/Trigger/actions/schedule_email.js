const EmailCampaign = {
  ...require('../../Email/campaign/get'),
  ...require('../../Email/campaign/create'),
  ...require('../../Email/campaign/update'),
}

const {
  TO,
  CC,
  BCC
} = require('../../Email/constants')

const Contact = require('../../Contact/get')
const Orm = require('../../Orm/index')
const Trigger = require('../create')
const { TriggerError } = require('../error')

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 */
async function actionScheduleEmail(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new TriggerError('actionScheduleEmail called on a trigger with a different action type')
  }

  const campaign = await EmailCampaign.get(trigger.campaign)

  if (campaign.executed_at) {
    throw new TriggerError(`EmailCampaign ${campaign.id} has been executed already.`)
  }

  if (trigger.trigger_object_type === 'contact') {
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

    return await EmailCampaign.update(campaign)
  }

  throw new TriggerError('Invalid trigger: actionScheduleEmail does not support non-contact triggers yet.')
}

/**
 * @param {import('../trigger').IStoredTrigger} trigger 
 * @returns {Promise<UUID>}
 */
async function clone(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new TriggerError('clone called on a trigger with an action type other than `schedule_email`')
  }

  const models = await EmailCampaign.getAll([trigger.campaign])
  /** @type {[IEmailCampaign]} */
  const [campaign] = await Orm.populate({
    models,
    associations: ['email_campaign.recipients']
  })

  const [cloned_campaign] = await EmailCampaign.createMany([{
    brand: trigger.brand,
    created_by: trigger.created_by,
    due_at: null,
    from: campaign.from,
    to: campaign.recipients.filter(r => r.recipient_type === TO),
    cc: campaign.recipients.filter(r => r.recipient_type === CC),
    bcc: campaign.recipients.filter(r => r.recipient_type === BCC),
    subject: campaign.subject,
    html: '',
    template: campaign.template,
  }])

  return Trigger.create({
    ...trigger,
    campaign: cloned_campaign,
  })
}

module.exports = {
  actionScheduleEmail,
  clone,
}
