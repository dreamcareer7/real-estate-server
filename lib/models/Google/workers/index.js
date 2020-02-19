const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const GoogleCredential = require('../credential')
const { syncGoogle }   = require('./job')
const { syncCalendar } = require('./job_cal')


const GmailWorker = {
  syncDue: async () => {
    const rows = await db.select('google/credential/sync_due', [config.google_sync.gap_hour])
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

      GmailWorker.syncGoogle(data)
    }

    return ids
  },

  syncGoogle: peanar.job({
    handler: syncGoogle,
    name: 'syncGoogle',
    queue: 'google',
    exchange: 'google'
  })
}

const calendarWorker = {
  syncDue: async () => {
    const rows = await db.select('calendarIntegration/google_sync_due', [GAP])
    const ids  = rows.map(r => r.id)

    const credentials = await GoogleCredential.getAll(ids)

    for (const credential of credentials) {

      if ( credential.calendar_sync_status !== 'pending' ) {
        await GoogleCredential.updateSyncStatus(credential.id, 'pending')
      }

      const data = {
        action: 'rechat_to_google',
        googleCredential: credential
      }

      calendarWorker.syncCalendar(data)
    }

    return ids
  },

  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncCalendar',
    queue: 'google',
    exchange: 'google'
  })
}


module.exports = {
  GmailWorker,
  calendarWorker
}
