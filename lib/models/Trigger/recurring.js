const { clone: cloneEmailTrigger} = require('./actions/schedule_email')

/**
 * @param {import('./trigger').IStoredTrigger} trigger 
 */
async function scheduleCopyForNextYear(trigger) {
  if (trigger.action === 'schedule_email') {
    return cloneEmailTrigger(trigger)
  }
}

module.exports = {
  scheduleCopyForNextYear
}
