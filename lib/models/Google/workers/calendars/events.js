const _ = require('lodash')

const config  = require('../../../../config')
const Orm     = require('../../../Orm')
const Context = require('../../../Context')

const MicrosoftCredential = require('../../../Microsoft/credential')
const GoogleCredential    = require('../../credential')
const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const CalendarIntegration = require('../../../CalendarIntegration')
const Contact             = require('../../../Contact')
const User                = require('../../../User')
const CrmTask             = require('../../../CRM/Task/index')

const { generateCalendarEvent, generateCrmTaskRecord, fetchEvents } = require('./common')

const _REASON = config.google_integration.crm_task_update_reason



const getToSyncCalendars = async function (gcid) {
  const calendars = await GoogleCalendar.getAllByGoogleCredential(gcid)

  return calendars.filter(cal => (cal.watcher_status === 'active' && !cal.deleted_at ))
}

const setupMapping = async (credential, calendar, confirmed, cancelled) => {
  Context.log('SyncGoogleCalendar', credential.id, calendar.id, 'confirmed.length', confirmed.length)
  Context.log('SyncGoogleCalendar', credential.id, calendar.id, 'cancelled.length', cancelled.length)

  const associations = ['crm_task.associations', 'crm_task.assignees', 'crm_task.reminders', 'crm_association.contact']

  // Find old google calendar events
  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldGoogleEvents    = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteId  = oldGoogleEvents.map(c => c.event_id)
  const oldEventsByEventId = _.keyBy(oldGoogleEvents, 'event_id')

  const deletedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && oldEventsByEventId[event.id].deleted_at) return true }).map(event => event.id)
  const updatedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && !oldEventsByEventId[event.id].deleted_at && (oldEventsByEventId[event.id].etag !== event.etag)) return true }).map(event => event.id)
  const google_event_ids      = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id)) return true }).map(event => oldEventsByEventId[event.id].id)

  // Find old crm_tasks
  const user = await User.get(credential.user)
  Context.set({user})
  Orm.setEnabledAssociations(associations)


  const records = await CalendarIntegration.getByGoogleIds(google_event_ids)

  const taskIds   = records.map(record => record.crm_task)
  const byCrmTask = _.keyBy(records, 'crm_task')

  const models = await CrmTask.getAll(taskIds)
  const tasks  = await Orm.populate({ models, associations })

  const refinedTasks = tasks.map(task => {
    return {
      ...task,
      google_event_id: byCrmTask[task.id].google_id
    }
  })

  const tasksByGoogleId = _.keyBy(refinedTasks, 'google_event_id')


  // find associations to create associationsMap
  const emails   = confirmed.filter(event => { if (event.attendees) return true }).flatMap(event => event.attendees.map(({email}) => email))
  const {ids}    = await Contact.fastFilter(credential.brand, [{ attribute_type: 'email', value: emails, operator: 'any' }], {})
  const contacts = await Contact.getAll(ids)


  /*
    const contactsMap = {
      'a@rechat.com': c1,
      'b@rechat.com': c2,
      'c@rechat.com': null
    }

    Its possible that there are'nt few attendes(contact) in rechat
  */
  const contactsMap = {}
  for (const email of emails) {
    const c = contacts.find(contact => (contact.emails && contact.emails.includes(email)))
    if (c) contactsMap[email] = c.id
  }

  /*
    const associationsMap = {
      event_id_1: [{ contact: c1.id, association_type: 'contact' }],
      event_id_2: [{ contact: c2.id, association_type: 'contact' }],
    }
  */
  const associationsMap = {}
  for (const event of confirmed.filter(event => { if (event.attendees) return true })) {
    associationsMap[event.id] = event.attendees.filter(attendee => { if (contactsMap[attendee.email]) return true }).map(attendee => {
      return {
        association_type: 'contact',
        contact: contactsMap[attendee.email]
      }
    })
  }


  return {
    oldEventsRemoteId,
    deletedEventRemoteIds,
    updatedEventRemoteIds,
    tasksByGoogleId,
    associationsMap
  }
}

const hadnleConfirmedEvents = async (calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds) => {
  // Concat these to arrays to support both updated and restored events
  const temp = updatedEventRemoteIds.concat(deletedEventRemoteIds)

  const filterd = confirmed.filter(c => { if ( !oldEventsRemoteId.includes(c.id) || temp.includes(c.id)) return true })
  const events  = filterd.map(event => generateCalendarEvent(calendar, event))

  const result  = await GoogleCalendarEvent.bulkUpsert(events)

  return _.keyBy(result, 'event_id')
}

const restoreEvents = async (credential, restoredEvents, eventsByRemoteId, associationsMap) => {
  const newTasks = restoredEvents.map(event => {
    return {
      ...generateCrmTaskRecord(credential, event),
      associations: associationsMap[event.id] || [],
      metadata: {
        all_day: event.start.date ? true : false
      }
    }
  })

  const createdTaskIds = await CrmTask.createMany(newTasks, _REASON)

  let i = 0
  const toUpdateCalIntRecords = restoredEvents.map(event => {
    return {
      google_id: eventsByRemoteId[event.id].id,
      etag: event.etag,
      local_etag: event.etag,
      crm_task: createdTaskIds[i++]
    }
  })

  await CalendarIntegration.gupsert(toUpdateCalIntRecords)

  return
}

const updateCrmTasks = async (credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByGoogleId, events) => {
  if ( events.length === 0 ) {
    return
  }

  const toUpdateTasks = events.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
    const gid = eventsByRemoteId[event.id].id
    const tid = tasksByGoogleId[gid].id

    if (tid) {
      const task = generateCrmTaskRecord(credential, event)

      task.id = tid

      task.metadata = tasksByGoogleId[gid].metadata
      task.metadata ? (task.metadata.all_day = event.start.date ? true : false) : (task.metadata = { all_day: event.start.date ? true : false })

      const liveAssociations = associationsMap[event.id] || []
      const oldAssociations  = tasksByGoogleId[gid].associations
      const oldContacts      = tasksByGoogleId[gid].contacts || []

      const associationByContact = _.keyBy(oldAssociations, 'contact.id')

      task.associations = liveAssociations.map(a => {
        const association = { contact: a.contact }

        if ( oldContacts.includes(a.contact) ) {
          const oldAssociation = associationByContact[a.contact]

          association.id = oldAssociation.id
          association.association_type = 'contact'
        } else {
          association.association_type = 'contact'
        }

        return association
      })


      /***  Handle reminders (Completed)  ***/
      const liveReminders = task.reminders || []
      const oldReminders  = tasksByGoogleId[gid].reminders
      const byTimestamp   = _.keyBy(oldReminders, 'timestamp')

      // @ts-ignore
      task.reminders = liveReminders.map(r => {
        const reminder = { timestamp: r.timestamp }

        if ( byTimestamp[r.timestamp] ) {
          reminder.id = byTimestamp[r.timestamp].id
          reminder.is_relative = byTimestamp[r.timestamp].is_relative
        } else {
          reminder.is_relative = r.is_relative
        }

        return reminder
      })

      return task
    }
  })

  const toUpdateCalIntRecords = events.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
    return {
      google_id: eventsByRemoteId[event.id].id,
      etag: event.etag,
      local_etag: event.etag,
      crm_task: null
    }
  })

  await CrmTask.updateMany(toUpdateTasks, credential.user, _REASON)
  await CalendarIntegration.gupsert(toUpdateCalIntRecords)

  return
}

const handleNewCrmTasks = async (credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, confirmed) => {
  if ( confirmed.length === 0 ) {
    return
  }

  const filterdEvents = confirmed.filter(event => { if (!oldEventsRemoteId.includes(event.id)) return true })
  const newTasks = filterdEvents.map(event => {
    return {
      ...generateCrmTaskRecord(credential, event),
      associations: associationsMap[event.id] || [],
      metadata: {
        all_day: event.start.date ? true : false
      }
    }
  })

  const createdTaskIds = await CrmTask.createMany(newTasks, _REASON)

  let i = 0
  const records = filterdEvents.map(event => {
    return {
      google_id: eventsByRemoteId[event.id].id,
      microsoft_id: null,

      crm_task: createdTaskIds[i++],
      contact: null,
      contact_attribute: null,
      deal_context: null,

      object_type: 'crm_task',
      event_type: 'Other',
      origin: (event.extendedProperties && event.extendedProperties.shared) ? ( ( !event.extendedProperties.shared.origin ? 'google' : event.extendedProperties.shared.origin ) ) : 'google',
      etag: event.etag,
      local_etag: event.etag
    }
  })

  await CalendarIntegration.insert(records)
}

const hadnleCanceledEvents = async (credential, calendar, cancelled) => {
  if ( cancelled.length === 0 ) {
    return
  }

  const canceledEventRemoteIds = cancelled.map(event => event.id)

  const ids     = await GoogleCalendarEvent.deleteLocalByRemoteIds(calendar, canceledEventRemoteIds)
  const records = await CalendarIntegration.getByGoogleIds(ids)

  const taskIds   = records.map(record => record.crm_task)
  const recordIds = records.map(record => record.id)

  await CalendarIntegration.deleteMany(recordIds)
  await CrmTask.remove(taskIds, credential.user, _REASON)
}

const getSameBrandEmails = async (brand) => {
  const gCredentials = await GoogleCredential.getByBrand(brand)
  const mCredentials = await MicrosoftCredential.getByBrand(brand)

  const emails = []

  gCredentials.forEach(function(record) {
    emails.push(record.email)
  })

  mCredentials.forEach(function(record) {
    emails.push(record.email)
  })

  return emails
}

const syncCalendarEvents = async (google, credential) => {
  let confirmedNum = 0

  try {
    const sameBrandEmails       = await getSameBrandEmails(credential.brand)
    const toSyncRemoteCalendars = await getToSyncCalendars(credential.id)

    for ( const calendar of toSyncRemoteCalendars ) {
      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar, sameBrandEmails)

      if ( confirmed.length === 0 && cancelled.length === 0 ) {
        await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
        continue
      }

      const { oldEventsRemoteId, deletedEventRemoteIds, updatedEventRemoteIds, tasksByGoogleId, associationsMap } = await setupMapping(credential, calendar, confirmed, cancelled)

      confirmedNum += confirmed.length

      const normalEvents   = confirmed.filter(c => !deletedEventRemoteIds.includes(c.id) )
      const restoredEvents = confirmed.filter(c => deletedEventRemoteIds.includes(c.id) )


      /***  Handle Confirmed(Created/Updated) Events ***/
      const eventsByRemoteId = await hadnleConfirmedEvents(calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds)


      /***  Update CRM_TASK records  ***/
      await updateCrmTasks(credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByGoogleId, normalEvents)


      /***  Restore CRM_TASK records  ***/
      await restoreEvents(credential, restoredEvents, eventsByRemoteId, associationsMap)


      /***  Handle new CRM_TASK  ***/
      await handleNewCrmTasks(credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, normalEvents)


      /***  Handle Canceled(Deleted) Events  ***/
      await hadnleCanceledEvents(credential, calendar, cancelled)


      /***  Update Calendar Sync Token  ***/
      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
    }

    const totalEventsNum = await GoogleCalendarEvent.getGCredentialEventsNum(credential.id)

    return  {
      status: true,
      ex: null,
      confirmedNum,
      totalNum: totalEventsNum[0]['count']
    }

  } catch (ex) {

    Context.log('SyncGoogleCalendar - syncCalendarEvents ex:', ex)

    return  {
      status: false,
      ex,
      confirmedNum,
      totalNum: 0
    }
  }
}


module.exports = {
  syncCalendarEvents
}