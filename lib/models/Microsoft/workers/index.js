const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const MicrosoftCredential = require('../credential')
const UsersJobs           = require('../../UsersJob')
const { syncMicrosoft, handleMessageNotif } = require('./job_outlook')
const { syncCalendar } = require('./job_cal')


const Outlook = {
  syncDue: async () => {
    const rows = await db.select('microsoft/credential/outlook_sync_due', [config.microsoft_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    const microsoftCredentials = await MicrosoftCredential.getAll(ids)

    for (const microsoftCredential of microsoftCredentials) {

      if ( microsoftCredential.sync_status !== 'pending' ) {
        await MicrosoftCredential.updateSyncStatus(microsoftCredential.id, 'pending')
      }

      const data = {
        action: 'microsoft_sync',
        microsoftCredential
      }

      MicrosoftWorker.syncMicrosoft(data)
    }

    return ids
  },

  syncMicrosoft: peanar.job({
    handler: syncMicrosoft,
    name: 'syncMicrosoft',
    queue: 'microsoft',
    exchange: 'microsoft'
  }),

  pushEvent: peanar.job({
    handler: handleMessageNotif,
    name: 'microsoftNotification',
    queue: 'microsoft_notifications',
    exchange: 'microsoft'
  })
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const rows = await db.select('microsoft/credential/cal_sync_due', [config.calendar_integration.time_gap])
    const cIds = rows.map(r => r.id)

    const credentials = await MicrosoftCredential.getAll(cIds)

    for (const credential of credentials) {

      const job = await UsersJobs.getByMicrosoftCredential(credential.id, 'calendar')

      if ( job && job.status === 'pending' ) {
        continue
      }

      await UsersJobs.upsertByMicrosoftCredential(credential, 'calendar', 'pending')

      const data = {
        action: 'sync_calendar',
        microsoftCredential: credential
      }

      Calendar.syncCalendar(data)
      ids.push(credential.id)
    }

    return ids
  },

  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncCalendar',
    queue: 'microsoft_cal',
    exchange: 'microsoft'
  }),

  pushEvent: peanar.job({
    handler: handleMessageNotif,
    name: 'microsoftCalNotification',
    queue: 'microsoft_cal_notifications',
    exchange: 'microsoft'
  })
}



module.exports = {
  Outlook,
  Calendar
}
