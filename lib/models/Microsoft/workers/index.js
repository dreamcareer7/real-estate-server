const config    = require('../../../config')
const db        = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const redis     = require('../../../data-service/redis').createClient()

const { syncOutlook, handleNotifications: handleOutlookNotif } = require('./job_outlook')
const { syncCalendar, handleNotifications: handleCalendarNotif } = require('./job_cal')
const { syncContacts } = require('./job_contacts')

const publisher = require('./publisher')

const zrangebyscore = promisify(redis.zrangebyscore.bind(redis))
const zrem          = promisify(redis.zrem.bind(redis))

const WEBHOOK_PROCESS_DELAY = config.microsoft_webhook_debouncer.process_delay
const MAILBOX_DEBOUNCER_KEY = config.microsoft_webhook_debouncer.mailbox_redis_key


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

  parseNotifications: async () => {
    const from  = Math.round(Date.now() / 1000) - WEBHOOK_PROCESS_DELAY
    const until = from + WEBHOOK_PROCESS_DELAY

    const records = await zrangebyscore(MAILBOX_DEBOUNCER_KEY, 0, until)

    if (records.length < 1) {
      return
    }

    for (const record of records) {

      const keyObj = JSON.parse(record)

      const payload = {
        subscriptionId: keyObj.sId,
        changeType: keyObj.cType,
        resourceData: {
          id: keyObj.rId,
        } 
      }

      Outlook.pushEvent({ payload })

      await zrem(MAILBOX_DEBOUNCER_KEY, record)
    }
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


module.exports = {
  Outlook,
  Calendar,
  Contacts
}