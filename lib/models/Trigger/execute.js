const db = require('../../utils/db')
const Context = require('../Context')

const { actionCreateEvent } = require('./actions/create_event')
const { actionScheduleEmail } = require('./actions/schedule_email')

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
 * @param {import('./trigger').IDueTrigger} trigger 
 */
async function execute(trigger) {
  Context.log(`<Trigger Due> - ${trigger.id} - ${trigger.action}`)

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

  // if (trigger.recurring) {
  //   await scheduleTrigger(trigger)
  // }

  // if (trigger.flow) {
  //   await Flow.executeTrigger(trigger)
  // }

  await markAsExecuted(trigger.id)
}

module.exports = {
  executeTrigger: execute,
}
