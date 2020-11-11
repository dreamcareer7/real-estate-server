const moment = require('moment-timezone')

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
const User = require('../../User/get')
const Trigger = require('../create')

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 */
async function getSuitableSendTime(trigger) {
  const { timezone } = await User.get(trigger.user)
  return moment(trigger.timestamp).tz(timezone).add(12, 'hours').startOf('day').add(8, 'hours').toISOString(true)
}

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 */
async function actionScheduleEmail(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new Error('actionScheduleEmail called on a trigger with a different action type')
  }

  const campaign = await EmailCampaign.get(trigger.campaign)

  if (campaign.executed_at) {
    throw new Error(`EmailCampaign ${campaign.id} has been executed already.`)
  }

  if (trigger.trigger_object_type === 'contact') {
    const contact = await Contact.get(trigger.contact)
    if (!contact.primary_email) {
      throw Error.Generic({
        message: 'Contact does not have an email'
      })
    }

    campaign.due_at = await getSuitableSendTime(trigger)
    campaign.to = [{
      email: contact.primary_email,
      contact: contact.id,
      recipient_type: 'Email',
    }]

    await EmailCampaign.update(campaign)
  }

  throw new Error('Invalid trigger: actionScheduleEmail called without a brand_email or a template.')
}

/**
 * @param {import('../trigger').IStoredTrigger} trigger 
 * @returns {Promise<UUID>}
 */
async function clone(trigger) {
  if (trigger.action !== 'schedule_email') {
    throw new Error('clone called on a trigger with an action type other than `schedule_email`')
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
