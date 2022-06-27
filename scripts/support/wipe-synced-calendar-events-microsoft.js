const { runInContext } = require('../../lib/models/Context/util')
const MicrosoftCredential = require('../../lib/models/Microsoft/credential/get');
const MicrosoftCalendar = require('../../lib/models/Microsoft/calendar/get');
const { deleteLocalCalendars } = require('../../lib/models/Microsoft/workers/subscriptions/calendar/calendars');

runInContext('wipe-synced-calendar-events', async function() {
  const cred = await MicrosoftCredential.get('1186f115-605f-426e-a19d-82ed0a69b099');
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(cred.id)

  await deleteLocalCalendars(cred, calendars)
}).catch(ex => console.error(ex))
