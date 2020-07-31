const config = require('../../../config')
const db     = require('../../../utils/db.js')

const { syncOutlook, handleNotifications: handleOutlookNotif } = require('./job_outlook')
const { syncCalendar, handleNotifications: handleCalendarNotif } = require('./job_cal')
const { syncContacts } = require('./job_contacts')
const { disconnect }   = require('./job_disconnect')

const publisher = require('./publisher')



const Outlook = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/microsoft/outlook_sync_due', [config.emails_integration.outlook.time_gap])

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

  syncOutlook: publisher.Outlook.syncOutlook(syncOutlook),
  pushEvent: publisher.Outlook.pushEvent(handleOutlookNotif)
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

  syncCalendar: publisher.Calendar.syncCalendar(syncCalendar),
  pushEvent: publisher.Calendar.pushEvent(handleCalendarNotif)
}

const Contacts = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/microsoft/mcontacts_sync_due', [config.contacts_integration.time_gap])

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

  syncContacts: publisher.Contacts.syncContacts(syncContacts)
}

const Disconnect = {
  credential: publisher.Disconnect.credential(disconnect)
}



module.exports = {
  Outlook,
  Calendar,
  Contacts,
  Disconnect
}