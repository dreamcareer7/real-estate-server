const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const GoogleCredential = require('../credential')
const UsersJobs        = require('../../UsersJob')
const { syncGoogle }   = require('./job_gmail')
const { syncCalendar } = require('./job_cal')


const Gmail = {
  syncDue: async () => {
    const rows = await db.select('google/credential/gmail_sync_due', [config.google_sync.gap_hour])
    const ids  = rows.map(r => r.id)

    const googleCredentials = await GoogleCredential.getAll(ids)

    for (const googleCredential of googleCredentials) {

      if ( googleCredential.sync_status !== 'pending' ) {
        await GoogleCredential.updateSyncStatus(googleCredential.id, 'pending')
      }

      const data = {
        action: 'google_sync',
        googleCredential
      }

      Gmail.syncGoogle(data)
    }

    return ids
  },

  syncGoogle: peanar.job({
    handler: syncGoogle,
    name: 'syncGoogle',
    queue: 'google_cal',
    exchange: 'google'
  })
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const rows = await db.select('google/credential/cal_sync_due', [config.calendar_integration.time_gap])
    const cIds = rows.map(r => r.id)

    const credentials = await GoogleCredential.getAll(cIds)

    for (const credential of credentials) {

      const job = await UsersJobs.getByGoogleCredential(credential.id, 'calendar')

      if ( job && job.status === 'pending' ) {
        continue
      }

      await UsersJobs.upsertByGoogleCredential(credential, 'calendar', 'pending')

      const data = {
        action: 'rechat_to_google',
        googleCredential: credential
      }

      Calendar.syncCalendar(data)
      ids.push(credential.id)
    }

    return ids
  },

  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncCalendar',
    queue: 'google_cal',
    exchange: 'google'
  })
}


module.exports = {
  Gmail,
  Calendar
}
