const { runInContext } = require('../../lib/models/Context/util')
const GoogleCredential = require('../../lib/models/Google/credential/get')
const GoogleCalendar = require('../../lib/models/Google/calendar/get')
const { deleteLocalCalendars } = require('../../lib/models/Google/workers/calendars/calendar')

runInContext('wipe-synced-calendar-events', async function() {
  const cred = await GoogleCredential.get('6476e1af-2c84-4345-ba14-601644ec0862')
  const calendars = await GoogleCalendar.getAllByGoogleCredential(cred.id)

  await deleteLocalCalendars(cred, calendars)
}).catch(ex => console.error(ex))
