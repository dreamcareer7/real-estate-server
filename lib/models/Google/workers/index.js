const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const UsersJobs        = require('../../UsersJob')
const GoogleCredential = require('../credential')
const { syncGoogle, gmailWebhook } = require('./job_gmail')
const { syncCalendar, googleCalWebhook } = require('./job_cal')


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
        action: 'sync_gmail',
        googleCredential
      }

      Gmail.syncGoogle(data)
    }

    return ids
  },

  syncGoogle: peanar.job({
    handler: syncGoogle,
    name: 'syncGoogle',
    queue: 'google',
    exchange: 'google'
  }),

  pushEvent: peanar.job({
    handler: gmailWebhook,
    name: 'gmailWebhook',
    queue: 'gmail_webhooks',
    exchange: 'google'
  })
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const rows = await db.select('google/credential/cal_sync_due', [config.calendar_integration.time_gap])
    const cIds = rows.map(r => r.id)

    const credentials = await GoogleCredential.getAll(cIds)

    for (const googleCredential of credentials) {

      const job = await UsersJobs.getByGoogleCredential(googleCredential.id, 'calendar')

      if ( job && job.status === 'pending' ) {
        continue
      }

      await UsersJobs.upsertByGoogleCredential(googleCredential, 'calendar', 'pending')

      const data = {
        action: 'sync_calendar',
        googleCredential
      }

      Calendar.syncCalendar(data)
      ids.push(googleCredential.id)
    }

    return ids
  },

  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncGoogleCalendar',
    queue: 'google_cal',
    exchange: 'google'
  }),

  pushEvent: peanar.job({
    handler: googleCalWebhook,
    name: 'googleCalWebhook',
    queue: 'google_calendar_webhooks',
    exchange: 'google'
  })
}


module.exports = {
  Gmail,
  Calendar
}
