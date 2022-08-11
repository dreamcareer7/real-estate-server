const { runInContext } = require('../../lib/models/Context/util')
const GoogleCredential = require('../../lib/models/Google/credential/get')
const GoogleCalendar = require('../../lib/models/Google/calendar/get')
const { deleteLocalCalendars } = require('../../lib/models/Google/workers/calendars/calendar')

/**
 * @param {import('commander').Command} program 
 */
async function main(program) {
  const options = program.opts()
  const cred = await GoogleCredential.get(options.credential)
  const calendars = await GoogleCalendar.getAllByGoogleCredential(cred.id)
  console.log(calendars.map(c => c.id))

  await deleteLocalCalendars(cred, calendars)
}

runInContext('wipe-synced-calendar-events', main, program => {
  program
    .option('-c, --credential <credential>', 'google credential id')
}).catch(ex => console.error(ex))
