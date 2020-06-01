const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const MicrosoftCredential = require('../credential')
const UsersJob            = require('../../UsersJob')
const { syncOutlook, handleNotifications: handleOutlookNotif } = require('./job_outlook')
const { syncCalendar, handleNotifications: handleCalendarNotif } = require('./job_cal')
const { syncContacts } = require('./job_contacts')


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

      Outlook.syncOutlook(data)
    }

    return ids
  },

  syncOutlook: peanar.job({
    handler: syncOutlook,
    name: 'syncOutlook',
    queue: 'microsoft',
    exchange: 'microsoft'
  }),

  pushEvent: peanar.job({
    handler: handleOutlookNotif,
    name: 'microsoftNotification',
    queue: 'microsoft_notifications',
    exchange: 'microsoft'
  })
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/microsoft/mcal_sync_due', [config.calendar_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_microsoft_calendar',
        cid: record.microsoft_credential
      }

      Calendar.syncCalendar(data)

      ids.push(record.id)
    }

    return ids
  },

  syncCalendar: peanar.job({
    handler: syncCalendar,
    name: 'syncMicrosoftCalendar',
    queue: 'microsoft_cal',
    exchange: 'microsoft'
  }),

  pushEvent: peanar.job({
    handler: handleCalendarNotif,
    name: 'microsoftCalNotification',
    queue: 'microsoft_cal_notifications',
    exchange: 'microsoft'
  })
}

const Contacts = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/microsoft/mcontacts_sync_due', [config.contact_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_microsoft_contact',
        cid: record.microsoft_credential
      }

      Contacts.syncContacts(data)

      ids.push(record.id)
    }

    return ids
  },

  syncContacts: peanar.job({
    handler: syncContacts,
    name: 'syncMicrosoftContacts',
    queue: 'microsoft_contacts',
    exchange: 'microsoft'
  })
}


module.exports = {
  Outlook,
  Calendar,
  // Contacts
}
