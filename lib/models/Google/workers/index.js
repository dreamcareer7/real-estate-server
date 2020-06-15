const config     = require('../../../config')
const Context    = require('../../Context')
const db         = require('../../../utils/db.js')
const { peanar } = require('../../../utils/peanar')

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

  syncGmail: peanar.job({
    handler: syncGmail,
    name: 'syncGmail',
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

    const records = await db.select('users_job/google/gcontacts_sync_due', [config.contacts_integration.time_gap])

    for (const record of records) {

      // check to know if current credential/job has already done ove the specific time period
      const diff = new Date().getTime() - new Date(record.start_at).getTime()
      if ( diff < config.contacts_integration.miliSec ) {
        Context.log('SyncGoogleContacts - Job queuing skipped due to recently queued job', record.id)
        continue
      }

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