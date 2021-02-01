const { clone: cloneEmailTrigger} = require('./actions/schedule_email')
const { TriggerError } = require('./error')

/**
 * @param {import('./trigger').IStoredTrigger} trigger 
 */
async function scheduleCopyForNextYear(trigger) {
  if (trigger.action === 'schedule_email') {
    return cloneEmailTrigger(trigger)
  }

  throw new TriggerError('Only recurring triggers with schedule_email action is supported.')
}

module.exports = {
  scheduleCopyForNextYear
}
