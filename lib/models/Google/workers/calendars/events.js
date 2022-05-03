const { keyBy } = require('lodash')

const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential = require('../../../Microsoft/credential')
const GoogleCredential    = require('../../credential')
const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const CalendarIntegration = require('../../../CalendarIntegration')
const CrmTask             = require('../../../CRM/Task/index')

const { generateCalendarEvent, generateCrmTaskRecord, fetchEvents } = require('./common')
const { getTasksByGoogleID } = require('./helpers/tasks')
const { getAssociationsMap } = require('./helpers/associations')
const getToSyncCalendars     = require('./helpers/toSync')

const _REASON = config.google_integration.crm_task_update_reason


const setupMapping = async (credential, calendar, confirmed, cancelled) => {
  Context.log('SyncGoogleCalendar', credential.id, calendar.id, 'confirmed.length', confirmed.length)
  Context.log('SyncGoogleCalendar', credential.id, calendar.id, 'cancelled.length', cancelled.length)

  // Find old google calendar events
  const confirmedRemoteIds = confirmed.map(e => e.id)
  const oldGoogleEvents    = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, confirmedRemoteIds)

  const oldEventsRemoteId  = oldGoogleEvents.map(c => c.event_id)
  const oldEventsByEventId = keyBy(oldGoogleEvents, 'event_id')

  const deletedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && oldEventsByEventId[event.id].deleted_at) return true }).map(event => event.id)
  const updatedEventRemoteIds = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id) && !oldEventsByEventId[event.id].deleted_at && (oldEventsByEventId[event.id].etag !== event.etag)) return true }).map(event => event.id)
  const google_event_ids      = confirmed.filter(event => { if (oldEventsRemoteId.includes(event.id)) return true }).map(event => oldEventsByEventId[event.id].id)

  // If we edit onetime event to a recurring event Google deliver a list with new events which contains the old event too.
  // So we will have a duplicate at the onetime old event date. We need to remove the old onetime event.
  let toRemoveEvents = []
  const newEventSeries = extractSeriesEvent(confirmed)
  if(newEventSeries.length > 0) {
    const oldSingleGoogleEvents = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(calendar, newEventSeries)
    toRemoveEvents = oldSingleGoogleEvents.filter(x => x.event_id !== null).map((x) => { return { id: x.event_id } })
  }
  const tasksByGoogleId = await getTasksByGoogleID(credential, google_event_ids)
  const associationsMap = await getAssociationsMap(credential, confirmed)

  return {
    oldGoogleEvents,
    oldEventsRemoteId,
    deletedEventRemoteIds,
    updatedEventRemoteIds,
    tasksByGoogleId,
    associationsMap,
    toRemoveEvents
  }
}

const extractSeriesEvent = (events) => {
  const seriesEvents = new Set()
  events.forEach(event => {
    if(event.recurringEventId) {
      if(!seriesEvents.has(event.recurringEventId)) {
        seriesEvents.add(event.recurringEventId)
      }
    }
  })
  return [...seriesEvents]
}

const findMovedEvents = async (calendar, confirmed) => {
  const movedEventRemoteIds = confirmed.map(event => event.id)

  return await GoogleCalendarEvent.getMovedEvents(calendar, calendar.id, movedEventRemoteIds)
}

const handleMovedEvents = async (calendar, confirmed) => {
  const movedEventIds = await findMovedEvents(calendar.google_credential, confirmed)
  const movedResult   = await GoogleCalendarEvent.updateCalendar(movedEventIds, calendar.id)

  return {
    movedEventIds,
    movedResult
  }
}

const hadnleConfirmedEvents = async (calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds) => {
  // Concat these two arrays to support both updated and restored events
  const temp = updatedEventRemoteIds.concat(deletedEventRemoteIds)

  const filterd = confirmed.filter(c => { if ( !oldEventsRemoteId.includes(c.id) || temp.includes(c.id)) return true })
  const events  = filterd.map(event => generateCalendarEvent(calendar, event))

  const result  = await GoogleCalendarEvent.bulkUpsert(events)

  return keyBy(result, 'event_id')
}

const restoreEvents = async (credential, restoredEvents, eventsByRemoteId, associationsMap) => {
  const newTasks = restoredEvents.map(event => {
    return {
      ...generateCrmTaskRecord(credential, event),
      associations: associationsMap[event.id] || [],
      all_day: event.start.date ? true : false
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

  return createdTaskIds
}

const updateCrmTasks = async (credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByGoogleId, events) => {
  if ( events.length === 0 ) {
    return []
  }

  const toUpdateTasks = events.filter(event => { if (updatedEventRemoteIds.includes(event.id)) return true }).map(event => {
    const gid = eventsByRemoteId[event.id].id
    const tid = tasksByGoogleId[gid].id

    if (tid) {
      const task = generateCrmTaskRecord(credential, event, tasksByGoogleId[gid])

      task.id = tid

      task.metadata = tasksByGoogleId[gid].metadata
      task.all_day  = event.start.date ? true : false

      const liveAssociations = associationsMap[event.id] || []
      const oldAssociations  = tasksByGoogleId[gid].associations || []
      const oldContacts      = tasksByGoogleId[gid].contacts || []

      const associationByContact = keyBy(oldAssociations, 'contact.id')

      const reservedAssoc = oldAssociations
        .filter(a => (a.association_type === 'contact' && a?.metadata?.origin === 'rechat'))
        .map(a => { return { id: a.id, contact: a.contact.id, association_type: 'contact' } })

      const reservedAssocIds = reservedAssoc.map(a => a.id)

      const associations = liveAssociations
        .filter(a => !reservedAssocIds.includes(a.id) )
        .map(a => {
          const association = { contact: a.contact, association_type: 'contact' }

          if ( oldContacts.includes(a.contact) ) {
            const oldAssociation = associationByContact[a.contact]
            association.id = oldAssociation.id
          }

          return association
        })

      task.associations = associations.concat(reservedAssoc)

      /***  Handle reminders (Completed)  ***/
      const liveReminders = task.reminders || []
      const oldReminders  = tasksByGoogleId[gid].reminders
      const byTimestamp   = keyBy(oldReminders, 'timestamp')

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

  return toUpdateTasks.map(t => t.id)
}

const handleNewCrmTasks = async (credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, confirmed) => {
  if ( confirmed.length === 0 ) {
    return []
  }

  const filterdEvents = confirmed.filter(event => { if (!oldEventsRemoteId.includes(event.id)) return true })
  const newTasks = filterdEvents.map(event => {
    return {
      ...generateCrmTaskRecord(credential, event),
      associations: associationsMap[event.id] || [],
      all_day: event.start.date ? true : false
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

  return createdTaskIds
}

const hadnleCanceledEvents = async (credential, calendar, cancelled) => {
  if ( cancelled.length === 0 ) {
    return []
  }

  const canceledEventRemoteIds = cancelled.map(event => event.id)

  const ids     = await GoogleCalendarEvent.deleteLocalByRemoteIds(calendar, canceledEventRemoteIds)
  const records = await CalendarIntegration.getByGoogleIds(ids)

  const taskIds   = records.map(record => record.crm_task)
  const recordIds = records.map(record => record.id)

  await CalendarIntegration.deleteMany(recordIds)
  await CrmTask.remove(taskIds, credential.user, _REASON)

  return taskIds
}

const getSameBrandEmails = async (cid, brand) => {
  const gcs = await GoogleCredential.getByBrand(brand)
  const mcs = await MicrosoftCredential.getByBrand(brand)

  const g = gcs.filter(c => (c.scope_summary && c.scope_summary.includes('calendar') && cid !== c.id)).map(c => c.email)
  const m = mcs.filter(c => (c.scope_summary && c.scope_summary.includes('calendar') && cid !== c.id)).map(c => c.email)

  return g.concat(m)
}

const syncCalendarEvents = async (google, credential) => {
  let upserteIds = []
  let deletedIds = []

  try {
    const sameBrandEmails       = await getSameBrandEmails(credential.id, credential.brand)
    const toSyncRemoteCalendars = await getToSyncCalendars(credential.id)

    for ( const calendar of toSyncRemoteCalendars ) {
      const { confirmed, cancelled, nextSyncToken } = await fetchEvents(google, calendar, sameBrandEmails)
      
      if ( confirmed.length === 0 && cancelled.length === 0 ) {
        await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)
        continue
      }

      /***  Handle Moved Events Between Calendars ***/
      await handleMovedEvents(calendar, confirmed)


      const { 
        oldEventsRemoteId,
        deletedEventRemoteIds,
        updatedEventRemoteIds,
        tasksByGoogleId,
        associationsMap,
        toRemoveEvents
      } = await setupMapping(credential, calendar, confirmed, cancelled)

      const normalEvents   = confirmed.filter(c => !deletedEventRemoteIds.includes(c.id) )
      const restoredEvents = confirmed.filter(c => deletedEventRemoteIds.includes(c.id) )


      /***  Handle Confirmed(Created/Updated) Events ***/
      const eventsByRemoteId = await hadnleConfirmedEvents(calendar, confirmed, oldEventsRemoteId, updatedEventRemoteIds, deletedEventRemoteIds)


      /***  Update CRM_TASK records  ***/
      const updatedTaskIds = await updateCrmTasks(credential, updatedEventRemoteIds, eventsByRemoteId, associationsMap, tasksByGoogleId, normalEvents)


      /***  Restore CRM_TASK records  ***/
      const restoredTaskIds = await restoreEvents(credential, restoredEvents, eventsByRemoteId, associationsMap)


      /***  Handle new CRM_TASK  ***/
      const createdTaskIds = await handleNewCrmTasks(credential, oldEventsRemoteId, eventsByRemoteId, associationsMap, normalEvents)


      /***  Handle Canceled(Deleted) Events  ***/
      const deletedTaskIds = await hadnleCanceledEvents(credential, calendar, [...cancelled,...toRemoveEvents])


      /***  Update Calendar Sync Token  ***/
      await GoogleCalendar.updateSyncToken(calendar.id, nextSyncToken)


      upserteIds = upserteIds.concat(updatedTaskIds).concat(restoredTaskIds).concat(createdTaskIds)
      deletedIds = deletedIds.concat(deletedTaskIds)
    }

    return  {
      status: true,
      ex: null,
      upserteIds,
      deletedIds
    }

  } catch (ex) {

    return  {
      status: false,
      ex,
      upserteIds,
      deletedIds
    }
  }
}


module.exports = {
  syncCalendarEvents
}