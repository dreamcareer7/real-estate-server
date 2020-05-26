const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const GoogleCredential = require('../credential')
const { syncGoogle, handleWebhooks: handleGmailWebhook } = require('./job_gmail')
const { syncCalendar, handleWebhooks: handleCalendarWebhook } = require('./job_cal')


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
    handler: handleGmailWebhook,
    name: 'gmailWebhook',
    queue: 'gmail_webhooks',
    exchange: 'google'
  })
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gcal_sync_due', [config.calendar_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_google_calendar',
        cid: record.google_credential
      }

      Calendar.syncCalendar(data)

      ids.push(record.id)
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
    handler: handleCalendarWebhook,
    name: 'googleCalWebhook',
    queue: 'google_cal_webhooks',
    exchange: 'google'
  })
}


module.exports = {
  Gmail,
  Calendar
}