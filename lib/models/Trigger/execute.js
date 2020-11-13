const db = require('../../utils/db')
const Context = require('../Context')

const { actionCreateEvent } = require('./actions/create_event')
const { actionScheduleEmail } = require('./actions/schedule_email')
const { getDue } = require('./get')
const { scheduleCopyForNextYear } = require('./recurring')

/**
 * @param {UUID} id 
 */
async function markAsExecuted(id) {
  const row_count = await db.update('trigger/mark_executed', [
    id,
    Context.getId()
  ])

  if (row_count !== 1) {
    throw Error.Conflict(`Cannot mark trigger '${id}' as executed because it's been deleted.`)
  }
}

/**
 * @param {UUID} id 
 */
async function lock(id) {
  Context.log('Acquiring lock for trigger', id)
  const { rows } = await db.query.promise('trigger/lock', [ id ])

  const [ lock ] = rows

  if (!lock) {
    throw Error.Generic(`Lock not acquired for trigger ${id}`)
  }

  if (lock.executed_at) {
    throw Error.Generic({
      message: 'Trigger is already executed',
      retry: false
    })
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

  switch (trigger.action) {
    case 'create_event':
      await actionCreateEvent(trigger)
      break

    case 'schedule_email':
      await actionScheduleEmail(trigger)
      break

    default:
      console.log('Unknown action')
  }

  Context.log(`<Trigger Executed> - ${trigger.id} - ${trigger.action}`)

  if (trigger.recurring) {
    await scheduleCopyForNextYear(trigger)
  }

  // if (trigger.flow) {
  //   await Flow.executeTrigger(trigger)
  // }

  await markAsExecuted(trigger.id)
}

module.exports = {
  executeTrigger: execute,
}
