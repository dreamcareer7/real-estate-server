const db = require('../../utils/db')
const Context = require('../Context')

const { actionCreateEvent } = require('./actions/create_event')
const { actionScheduleEmail } = require('./actions/schedule_email')
const { TriggerError } = require('./error')
const { getDue } = require('./get')
const { scheduleCopyForNextYear } = require('./recurring')
const Flow = require('../Flow/progress')

/**
 * @param {UUID} id 
 */
async function markAsExecuted(id, crm_task) {
  const row_count = await db.update('trigger/mark_executed', [
    id,
    crm_task,
    Context.getId()
  ])

  if (row_count !== 1) {
    throw new TriggerError(`Cannot mark trigger '${id}' as executed because it's been deleted.`)
  }
}

/**
 * @param {UUID} id 
 * @param {string} error_message
 */
async function markAsFailed(id, error_message) {
  return db.update('trigger/mark_failed', [
    id,
    error_message,
    Context.getId()
  ])
}

/**
 * @param {UUID} id 
 */
async function lock(id) {
  Context.log('Acquiring lock for trigger', id)
  const { rows } = await db.query.promise('trigger/lock', [ id ])

  const [ lock ] = rows

  if (!lock) {
    throw new TriggerError(`Lock not acquired for trigger ${id}`, true)
  }

  if (lock.executed_at) {
    throw new TriggerError('Trigger is already executed')
  }

  Context.log(`Lock acquired on trigger ${id}`)
}

/**
 * @param {UUID} id trigger id to be executed
 */
async function execute(id) {
  const trigger = await getDue(id)
  if (!trigger) {
    Context.log(`Trigger ${id} was not found in due triggers`)
    return
  }

  await lock(trigger.id)

  Context.log(`<Trigger Execute> - ${trigger.id} - ${trigger.action} on ${trigger.trigger_object_type} ${trigger.trigger_object_type === 'contact' ? trigger.contact : trigger.deal}`)

  /** @type {UUID | null} */
  let crm_task = null

  try {
    switch (trigger.action) {
      case 'create_event':
        crm_task = await actionCreateEvent(trigger)
        break

      case 'schedule_email':
        await actionScheduleEmail(trigger)
        break

      default:
        /** @ts-ignore */
        throw new TriggerError(`Unknown action ${trigger.action} on trigger ${trigger.id}`)
    }
  } catch (ex) {
    if (ex.retry === false) {
      await markAsFailed(trigger.id, ex.message)
    }

    throw ex
  }
  
  Context.log(`<Trigger Executed> - ${trigger.id} - ${trigger.action}`)
  if (trigger.recurring) {
    await scheduleCopyForNextYear(trigger)
  }
  
  await markAsExecuted(trigger.id, crm_task)

  if (trigger.flow) {
    await Flow.markStepExecuted(trigger.flow, trigger.flow_step, trigger.id);
  }
}

module.exports = {
  execute,
}
