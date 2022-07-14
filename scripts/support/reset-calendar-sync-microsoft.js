const Context = require('../../lib/models/Context/index')
const { runInContext } = require('../../lib/models/Context/util')
const { handleCalendarScope: restartCalendarSync } = require('../../lib/models/Microsoft/auth_link')
const MicrosoftCredential = require('../../lib/models/Microsoft/credential/get')
const { resetSyncState } = require('../../lib/models/Microsoft/workers/job_reset_calendar_sync')

runInContext('reset-calendar-sync-microsoft', async function() {
  const cred = await MicrosoftCredential.get('cdc5eb73-5736-4261-a3dd-c7dbf29cc794')
  await resetSyncState(cred)

  Context.log('MicrosoftCalendarReconnectCalendar - Job Started')
  await restartCalendarSync(cred)
  Context.log('MicrosoftCalendarReconnectCalendar - Job Finished')
}).catch(ex => console.error(ex))
