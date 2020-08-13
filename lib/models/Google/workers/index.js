const config = require('../../../config')
const db     = require('../../../utils/db.js')

const publisher = require('./publisher')



const Gmail = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gmail_sync_due', [config.emails_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_gmail',
        cid: record.google_credential,
        immediate: false
      }

      Gmail.syncGmail(data)

      ids.push(record.id)
    }

    return ids
  },

  syncGmail: publisher.Gmail.syncGmail,
  pushEvent: publisher.Gmail.pushEvent
}

const Calendar = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gcal_sync_due', [config.calendar_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_google_calendar',
        cid: record.google_credential,
        immediate: false
      }

      Calendar.syncCalendar(data)

      ids.push(record.id)
    }

    return ids
  },

  syncCalendar: publisher.Calendar.syncCalendar,
  pushEvent: publisher.Calendar.pushEvent
}

const Contacts = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gcontacts_sync_due', [config.contacts_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_google_contact',
        cid: record.google_credential
      }

      Contacts.syncContacts(data)

      ids.push(record.id)
    }

    return ids
  },

  syncContacts: publisher.Contacts.syncContacts
}


module.exports = {
  Gmail,
  Contacts,
  Calendar
}