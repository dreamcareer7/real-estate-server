const { runInContext } = require('../../lib/models/Context/util')
const MicrosoftCredential = require('../../lib/models/Microsoft/credential/get')
const MicrosoftCalendar = require('../../lib/models/Microsoft/calendar/get')
const { deleteLocalCalendars } = require('../../lib/models/Microsoft/workers/subscriptions/calendar/calendars')

/**
 * @param {import('commander').Command} program 
 */
async function main(program) {
  const options = program.opts()
  const cred = await MicrosoftCredential.get(options.credential)
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(cred.id)
  console.log(calendars.map(c => c.id))

  await deleteLocalCalendars(cred, calendars)
}

runInContext('wipe-synced-calendar-events', main, program => {
  program
    .option('-c, --credential <credential>', 'microsoft credential id')
}).catch(ex => console.error(ex))
