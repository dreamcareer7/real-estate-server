const config    = require('../../../config')
const db        = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const redis     = require('../../../data-service/redis').createClient()

const publisher = require('./publisher')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const WEBHOOK_PROCESS_DELAY  = 25
const MAILBOX_DEBOUNCER_KEY  = 'google_mailbox_debouncer'
const CALENDAR_DEBOUNCER_KEY = 'google_calendar_debouncer'

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

  parseNotifications: async () => {
    const from  = Math.round(Date.now() / 1000) - WEBHOOK_PROCESS_DELAY
    const until = from + WEBHOOK_PROCESS_DELAY

    const records = await zrangebyscore(MAILBOX_DEBOUNCER_KEY, 0, until)

    if (records.length < 1) {
      return
    }

    for (const key of records) {

      Gmail.pushEvent({ key })

      await zrem(MAILBOX_DEBOUNCER_KEY, key)
    }
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

  parseNotifications: async () => {
    const from  = Math.round(Date.now() / 1000) - WEBHOOK_PROCESS_DELAY
    const until = from + WEBHOOK_PROCESS_DELAY

    const records = await zrangebyscore(CALENDAR_DEBOUNCER_KEY, 0, until)

    if (records.length < 1) {
      return
    }

    for (const record of records) {

      const keyObj = JSON.parse(record)

      // make payload object meaningful
      const payload = {
        calendarId: keyObj.calId,
        channelId: keyObj.chId,
        resourceId: keyObj.rId
      }

      Calendar.pushEvent({ payload })

      await zrem(CALENDAR_DEBOUNCER_KEY, record)
    }
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