const config     = require('../../../../config')
const db         = require('../../../../utils/db.js')
const { peanar } = require('../../../../utils/peanar')

const GoogleCredential    = require('../../../Google/credential')
const MicrosoftCredential = require('../../../Microsoft/credential')
const { syncGoogleCalendar, syncMicrosoftCalendar } = require('./job')

const GCalendarWorker = {
  syncDue: async () => {
    const rows = await db.select('calendar/integration/google_sync_due', [config.calendar_integration.time_gap])
    const ids  = rows.map(r => r.id)

    const googleCredentials = await GoogleCredential.getAll(ids)

    for (const googleCredential of googleCredentials) {

      if ( googleCredential.calendar_sync_status !== 'pending' ) {
        await GoogleCredential.updateSyncStatus(googleCredential.id, 'pending')
      }

      const data = {
        action: 'rechat_cal_to_google_cal',
        googleCredential
      }

      GCalendarWorker.syncGoogleCalendar(data)
    }

    return ids
  },

  syncGoogleCalendar: peanar.job({
    handler: syncGoogleCalendar,
    name: 'syncGoogleCalendar',
    queue: 'google',
    exchange: 'google'
  })
}

const MCalendarWorker = {
  syncDue: async () => {
    const rows = await db.select('calendar/integration/microsoft_sync_due', [config.calendar_integration.time_gap])
    const ids  = rows.map(r => r.id)

    const microsoftCredentials = await MicrosoftCredential.getAll(ids)

    for (const microsoftCredential of microsoftCredentials) {

      if ( microsoftCredential.calendar_sync_status !== 'pending' ) {
        await MicrosoftCredential.updateSyncStatus(microsoftCredential.id, 'pending')
      }

      const data = {
        action: 'rechat_cal_to_microsoft_cal',
        microsoftCredential
      }

      MCalendarWorker.syncMicrosoftCalendar(data)
    }

    return ids
  },

  syncMicrosoftCalendar: peanar.job({
    handler: syncMicrosoftCalendar,
    name: 'syncMicrosoftCalendar',
    queue: 'microsoft',
    exchange: 'microsoft'
  })
}

module.exports = {
  GCalendarWorker,
  MCalendarWorker
}
