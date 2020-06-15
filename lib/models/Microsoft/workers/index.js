const config     = require('../../../config')
const Context    = require('../../Context')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const { syncOutlook, handleNotifications: handleOutlookNotif } = require('./job_outlook')
const { syncCalendar, handleNotifications: handleCalendarNotif } = require('./job_cal')
const { syncContacts } = require('./job_contacts')


const Outlook = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/microsoft/outlook_sync_due', [config.emails_integration.outlook])

    for (const record of records) {

      const data = {
        action: 'sync_outlook',
        cid: record.microsoft_credential
      }

      Outlook.syncOutlook(data)

      ids.push(record.id)
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

    const records = await db.select('users_job/microsoft/mcontacts_sync_due', [config.contacts_integration.time_gap])

    for (const record of records) {

      // check to know if current credential/job has already done ove the specific time period
      const diff = new Date().getTime() - new Date(record.start_at).getTime()
      if ( diff < config.contacts_integration.miliSec ) {
        Context.log('SyncMicrosoftContacts - Job queuing skipped due to recently queued job', record.id)
        continue
      }

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
  Contacts
}