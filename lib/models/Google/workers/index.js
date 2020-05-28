const config     = require('../../../config')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

const { syncGoogle, handleWebhooks: handleGmailWebhook } = require('./job_gmail')
const { syncCalendar, handleWebhooks: handleCalendarWebhook } = require('./job_cal')
const { syncContacts } = require('./job_contacts')


const Gmail = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gmail_sync_due', [config.google_sync.time_gap])

    for (const record of records) {

      const data = {
        action: 'sync_gmail',
        cid: record.google_credential
      }

      Gmail.syncGoogle(data)

      ids.push(record.id)
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

const Contacts = {
  syncDue: async () => {
    const ids = []

    const records = await db.select('users_job/google/gcontacts_sync_due', [config.contact_integration.time_gap])

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

  syncContacts: peanar.job({
    handler: syncContacts,
    name: 'syncGoogleContacts',
    queue: 'google_contacts',
    exchange: 'google'
  })
}


module.exports = {
  Gmail,
  Contacts,
  Calendar
}