const config    = require('../../../config')
const db        = require('../../../utils/db.js')
const publisher = require('./publisher')

const { syncGmail, handleWebhooks: handleGmailWebhook } = require('./job_gmail')
const { syncCalendar, handleWebhooks: handleCalendarWebhook } = require('./job_cal')
const { syncContacts } = require('./job_contacts')


const Gmail = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gmail_sync_due', [config.emails_integration.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_gmail',
        cid: record.google_credential
      }

      Gmail.syncGmail(data)

      ids.push(record.id)
    }

    return ids
  },

  syncGmail: publisher.Gmail.syncGmail(syncGmail),
  pushEvent: publisher.Gmail.pushEvent(handleGmailWebhook)
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

  syncCalendar: publisher.Calendar.syncCalendar(syncCalendar),
  pushEvent: publisher.Calendar.pushEvent(handleCalendarWebhook)
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

  syncContacts: publisher.Contacts.syncContacts(syncContacts)
}


module.exports = {
  Gmail,
  Contacts,
  Calendar
}