const db = require('../../utils/db')
const Context = require('../Context/index')

const CrmTask = {
  ...require('../CRM/Task/get'),
  ...require('../CRM/Task/upsert'),
}
const EmailCampaign = {
  ...require('../Email/campaign/update'),
  ...require('../Email/campaign/get'),
  ...require('../Email/campaign/lock'),
}

const { get } = require('./get')
const { filter } = require('./filter')

/**
 * @param {UUID} id
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function update(id, data) {
  const trigger = await get(id)

  if (trigger.executed_at) {
    if (trigger.action === 'create_event') {

      const crm_task = await CrmTask.get(trigger.event)

      if (crm_task.due_date > Date.now() / 1000) {
        throw Error.Forbidden('Unable to update an executed trigger.')
      } else {
        await deleteUndueEvent(crm_task, trigger.user)
      }

    } else if (trigger.action === 'schedule_email') {

      const campaign = await EmailCampaign.get(trigger.campaign)

      if (campaign.executed_at) {
        throw Error.Forbidden('Unable to update an executed trigger.')
      } else {
        await EmailCampaign.lock(campaign.id)
        await EmailCampaign.scheduleAt(trigger.campaign, null)
      }
    }
  }

  return updateTrigger(id, data)
}

/**
 * Deletes a crm_task if it's not past due date yet.
 * @param {ITask} crm_task
 * @param {UUID} user_id 
 */
async function deleteUndueEvent(crm_task, user_id) {
  const now = Date.now() / 1000

  if (crm_task.due_date < now) {
    return CrmTask.remove([crm_task.id], user_id)
  }
}

/**
 * @param {UUID} id
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function updateTrigger(id, data) {
  await db.update('trigger/update', [
    id,
    Context.getId(),

    data.user,

    data.event_type,
    data.wait_for,
    data.time,
    data.recurring || false,

    data.brand_event,
    data.campaign
  ])
  const [ nextTriggerId ] = await filter({ scheduled_after: [id] })
  if (nextTriggerId) {
    const nextTrigger = await get(nextTriggerId)
    await updateTrigger(nextTriggerId, {
      user: data.user,
      event_type: data.event_type,
      wait_for: data.wait_for,
      recurring: nextTrigger.recurring,
      brand_event: nextTrigger.brand_event,
      campaign: nextTrigger.campaign ?? undefined
    })
  }
}

async function clearOrigin(triggerId) {   
  await db.update('trigger/null-origin', [triggerId])
}

module.exports = {
  update,
  deleteOrigin,
}
