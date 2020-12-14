const db = require('../../utils/db')
const Context = require('../Context/index')

const CrmTask = {
  ...require('../CRM/Task/get'),
  ...require('../CRM/Task/upsert'),
}
const EmailCampaign = require('../Email/campaign/update')

const { get } = require('./get')

/**
 * @param {UUID} id
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function update(id, data) {
  const trigger = await get(id)

  if (trigger.executed_at && (trigger.executed_at + 3 * 86400 < Date.now() / 1000)) {
    throw Error.Forbidden('Unable to update an executed trigger.')
  }

  await updateAssociatedObjects(trigger, data)
  return updateTrigger(id, data)
}

/**
 * Deletes a crm_task if it's not past due date yet.
 * @param {UUID} id
 * @param {UUID} user_id 
 */
async function deleteUndueEvent(id, user_id) {
  const crm_task = await CrmTask.get(id)
  const now = Date.now() / 1000

  if (crm_task.due_date < now) {
    return CrmTask.remove([crm_task.id], user_id)
  }
}

/**
 * @param {import('./trigger').IStoredTrigger} trigger
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function updateAssociatedObjects(trigger, data) {
  if (trigger.executed_at === null) return

  switch (trigger.action) {
    case 'create_event':
      await deleteUndueEvent(trigger.event, trigger.user)
      break
    case 'schedule_email':
      await EmailCampaign.scheduleAt(trigger.campaign, null)
    default:
      break
  }
}

/**
 * @param {UUID} id
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function updateTrigger(id, data) {
  return db.update('trigger/update', [
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
}

module.exports = {
  update,
}
