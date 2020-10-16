const EmailCampaign = {
  ...require('../../Email/campaign/get'),
  ...require('../../Email/campaign/update'),
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

  await EmailCampaign.scheduleAt(campaign.id, trigger.due_at)

  throw new Error('Invalid trigger: actionScheduleEmail called without a brand_email or a template.')
}

module.exports = {
  actionScheduleEmail
}
