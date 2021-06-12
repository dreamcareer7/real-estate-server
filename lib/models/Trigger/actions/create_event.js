const CrmTask = require('../../CRM/Task/index')
const BrandEvent = require('../../Brand/event')
const { TriggerError } = require('../error')
const Context = require('../../Context')

/**
 * @param {import('../trigger').IDueTrigger} trigger 
 */
async function actionCreateEvent(trigger) {
  if (trigger.action !== 'create_event') {
    throw new TriggerError('actionCreateEvent called on a trigger with a different action type')
  }

  const brand_event = await BrandEvent.get(trigger.brand_event)
  const due_date = trigger.timestamp

  /** @type {IReminderInput[]} */
  const reminders = []

  /** @type {ICrmAssociationInput[]} */
  const associations = []

  if (brand_event.reminder) {
    reminders.push({
      is_relative: false,
      timestamp: due_date - brand_event.reminder
    })
  }

  if (trigger.trigger_object_type === 'contact') {
    associations.push({
      association_type: 'contact',
      contact: trigger.contact,
      brand: trigger.brand,
      created_by: trigger.created_by,
    })
  } else if (trigger.object_type === 'deal_context') {
    associations.push({
      association_type: 'deal',
      deal: trigger.deal,
      brand: trigger.brand,
      created_by: trigger.created_by,
    })
  }

  /** @type {RequireProp<ITaskInput, "brand" | "created_by">} */
  const crm_task = {
    brand: trigger.brand,
    created_by: trigger.created_by,
    title: brand_event.title,
    due_date,
    task_type: brand_event.task_type,
    status: 'PENDING',
    assignees: [trigger.user],
    associations,
    reminders
  }

  try {
    const created = await CrmTask.create(crm_task)

    return created.id
  } catch (ex) {
    if (ex.code === 'Validation') {
      Context.log(crm_task)
    }

    throw ex
  }
}

module.exports = {
  actionCreateEvent,
}
