const _ = require('lodash')

const db = require('../../utils/db')
const Context = require('../Context')
const { getAll } = require('./get')
const { filter } = require('./filter')
const EmailCampaign = {
  ...require('../Email/campaign/get'),
  ...require('../Email/campaign/delete'),
}
const CrmTask = {
  ...require('../CRM/Task/get'),
  ...require('../CRM/Task/upsert'),
}

/**
 * @param {UUID[]} ids 
 * @param {UUID} user_id
 */
async function deleteTriggers(ids, user_id) {
  const triggers = await getAll(ids)
  const recurring_triggers = triggers.filter(t => t.recurring).map(t => t.id)
  const executed_triggers = triggers.filter(/** @type {import('./trigger').TIsTriggerExecuted} */(t => t.executed_at !== null))

  const campaigns = [], events = []
  for (const trigger of executed_triggers) {
    switch (trigger.action) {
      case 'create_event':
        events.push(trigger.event)
        break
      case 'schedule_email':
        campaigns.push(trigger.campaign)
        break
      default:
        break
    }
  }

  await deleteUnsentEmailCampaigns(campaigns, user_id)
  await deleteUndueEvents(events, user_id)

  await db.update('trigger/delete', [ ids, Context.getId() ])
  
  // For recurring triggers, we need to delete the whole chain recursively,
  // not just a node.
  const nextTriggers = await filter({ scheduled_after: recurring_triggers })
  if (nextTriggers.length > 0) {
    await deleteTriggers(nextTriggers, user_id)
  }
}

/**
 * Deletes a campaign if it hasn't been sent yet.
 * @param {UUID[]} campaign_ids
 * @param {UUID} user 
 */
async function deleteUnsentEmailCampaigns(campaign_ids, user) {
  if (campaign_ids.length < 1) return

  const campaigns = await EmailCampaign.getAll(campaign_ids)
  const pending_campaigns = campaigns.filter(c => c.executed_at === null).map(c => c.id)

  const by_brand = _.groupBy(pending_campaigns, 'brand')

  for (const [brand, ids] of Object.entries(by_brand)) {
    await EmailCampaign.deleteMany(ids, user, brand)
  }
}

/**
 * Deletes a crm_task if it's not past due date yet.
 * @param {UUID[]} ids 
 * @param {UUID} user_id 
 */
async function deleteUndueEvents(ids, user_id) {
  const crm_tasks = await CrmTask.getAll(ids)
  const now = Date.now() / 1000
  const to_delete = crm_tasks.filter(t => t.due_date > now).map(t => t.id)

  if (to_delete.length > 0) {
    return CrmTask.remove(to_delete, user_id)
  }
}

/**
 * Event handler for contact deletion
 * @param {UUID[]} contacts 
 * @param {UUID} user 
 * @param {UUID} brand
 */
async function deleteForContacts(contacts, user, brand) {
  const ids = await filter({
    brand,
    contacts,
  })

  return deleteTriggers(ids, user)
}

async function contactsDeletedHandler({ user_id, contact_ids }) {
  const ids = await filter({
    contacts: contact_ids,
    deleted_at: null,
  })
  return deleteTriggers(ids, user_id)
}

module.exports = {
  delete: deleteTriggers,
  deleteForContacts,
  contactsDeletedHandler,
}
