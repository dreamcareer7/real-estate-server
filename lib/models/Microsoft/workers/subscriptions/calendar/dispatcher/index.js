const { keyBy } = require('lodash')
const config = require('../../../../../../config')

const CalendarIntegration    = require('../../../../../CalendarIntegration')
const MicrosoftCalendarEvent = require('../../../../calendar_events')
const MicrosoftCalendar      = require('../../../../calendar')

const { pruneDeletedMicrosoftEvents, pruneOffTrackRechatEvents } = require('./prune')
const { generateMicrosoftCalendarEvent } = require('./helper')

const objectTypes = ['crm_task', 'contact_attribute', 'deal_context']



const refineIntegrationRecords = async (events) => {
  const crmTaskIds         = events.filter(e => e.object_type === 'crm_task').map(e => e.id)
  const contactIds         = events.filter(e => e.object_type === 'contact').map(e => e.id)
  const contactAttIds      = events.filter(e => e.object_type === 'contact_attribute').map(e => e.id)
  const dealContextIds     = events.filter(e => (e.object_type === 'deal_context' && e.event_type !== 'home_anniversary' )).map(e => e.id)
  const homeAnniversaryIds = events.filter(e => (e.object_type === 'deal_context' && e.event_type === 'home_anniversary' )).map(e => e.id)

  const crmTasksIntRecords          = await CalendarIntegration.getByCrmTasks(crmTaskIds)
  const contactsIntRecords          = await CalendarIntegration.getByContacts(contactIds)
  const contactAttsIntRecords       = await CalendarIntegration.getByContactAttributes(contactAttIds)
  const dealContextsIntRecords      = await CalendarIntegration.getByDealContexts(dealContextIds)
  const homeAnniversariesIntRecords = await CalendarIntegration.getByHomeAnniversaries(homeAnniversaryIds)

  const microsoftCalendarEventIds = new Set()

  for (const event of events) {
    if ( event.object_type === 'crm_task' ) {
      event.integrations = crmTasksIntRecords.filter(record => (event.id === record.crm_task))
    }

    if ( event.object_type === 'contact' ) {
      event.integrations = contactsIntRecords.filter(record => (event.id === record.contact && record.microsoft_id))
    }

    if ( event.object_type === 'contact_attribute' ) {
      event.integrations = contactAttsIntRecords.filter(record => (event.id === record.contact_attribute && record.microsoft_id))
    }

    if ( event.object_type === 'deal_context' && event.event_type !== 'home_anniversary' ) {
      event.integrations = dealContextsIntRecords.filter(record => (event.id === record.deal_context && event.contact === null && record.microsoft_id))
    }

    if ( event.object_type === 'deal_context' && event.event_type === 'home_anniversary' ) {
      event.integrations = homeAnniversariesIntRecords.filter(record => (event.id === record.deal_context && event.contact === record.contact && record.microsoft_id))
    }

    event.integrations.forEach(function(record) {
      if (record.microsoft_id) {
        microsoftCalendarEventIds.add(record.microsoft_id)
      }
    })
  }

  const microsoftCalEvents = await MicrosoftCalendarEvent.getAll(Array.from(microsoftCalendarEventIds))
  const microsoftCalIds    = [...new Set(microsoftCalEvents.map(e => e.microsoft_calendar))]
  const microsoftCalendars = await MicrosoftCalendar.getAll(microsoftCalIds)


  return {
    microsoftCalEventsById: keyBy(microsoftCalEvents, 'id'),
    microsoftCalendarsById: keyBy(microsoftCalendars, 'id')
  }
}

const refineEvents = async (credential, calEvents, timeZone, isInitialSync) => {
  let events_level_1  = []
  let events_level_2  = []

  const created = []
  const updated = []
  const deleted = []

  // level #1 refine
  for (const event of calEvents) {
    if ( !objectTypes.includes(event.object_type) ) {
      continue
    } 

    if ( event.object_type === 'deal_context' && event.event_type === 'home_anniversary' ) {
      event.orginal_id = event.id
      event.id = event.id.split(':')[1]
    }

    events_level_1.push(event)
  }

  const { microsoftCalEventsById, microsoftCalendarsById } = await refineIntegrationRecords(events_level_1)

  // level #2 refine (exclude events of deleted calendars in side of microsoft)
  for (const event of events_level_1) {
    // Pass newly created events
    if ( event.integrations.length === 0 ) {
      events_level_2.push(event)
      continue
    }

    for (const record of event.integrations) {
      // Skip if it's from other origin than microsoft. e.g. : google
      if(!(record.origin === 'microsoft' || record.origin === 'rechat')) {
        continue
      }
      const microsoftCalEvent = microsoftCalEventsById[record.microsoft_id]
      // Skip if the event is not in same credential scope
      if(microsoftCalEvent && microsoftCalEvent?.microsoft_credential !== credential.id)  {
        continue
      }
      const microsoftCal      = microsoftCalendarsById[microsoftCalEvent?.microsoft_calendar]

      if ( !microsoftCal?.deleted_at ) {
        record.microsoftCalEvent = microsoftCalEvent
        record.microsoftCal      = microsoftCal
        events_level_2.push(event)
      } else {
        continue
      }
    }
  }

  // level #3 refine
  for (const event of events_level_2) {
    event.timeZone = timeZone
    event.resource = generateMicrosoftCalendarEvent(credential, event, timeZone, isInitialSync)

    if ( event.deleted_at && event.integrations && event.integrations.length === 0 ) {
      continue
    }

    if ( event.deleted_at || event.parent_deleted_at ) {
      for (const record of event.integrations) {
        if ( record.microsoftCal?.microsoft_credential === credential.id ) {
          event.integrations = [record]
  
          deleted.push(event)
          break
        }
      }

      continue
    }

    if ( event.integrations.length === 0 ) {
      created.push(event)
      continue
    }

    let isUpdated = false

    for (const record of event.integrations) {
      if ( record.microsoftCal && (record.microsoftCal?.microsoft_credential === credential.id) ) {
        isUpdated = true

        if ( record.etag === record.local_etag ) {
          break
        }

        event.integrations = [record]

        updated.push(event)
        break
      }
    }

    if (!isUpdated) {
      created.push(event)
    }
  }

  // flush memory
  events_level_1 = []
  events_level_2 = []

  return {
    created,
    updated,
    deleted
  }
}

const handleCreatedEvents = async (credential, events) => {
  const calendar = await MicrosoftCalendar.get(credential.microsoft_calendar)
  let counter = 1

  const eventsByOrgId = keyBy(events, 'orginal_id')
  const eventsById    = keyBy(events, 'id')

  const remoteEvents  = events.map(e => ({
    requestId: counter++,
    calendarId: calendar.calendar_id,
    resource: e.resource,
    timeZone: e.timeZone,
    sendUpdates: e.resource.sendUpdates
  }))
  
  const { microsoftCalEvents, error } = await MicrosoftCalendarEvent.batchInsert(credential, calendar, remoteEvents)

  if (microsoftCalEvents) {
    const records = microsoftCalEvents.map(record => {

      let extension = null
      let event     = null

      for ( const ext of record.extensions ) {
        if ( ext.id === config.microsoft_integration.openExtension.calendar.id ) {
          extension = ext
        }
      }

      event = eventsById[extension.rechat_cal_event_id]

      if ( extension.object_type === 'deal_context' && extension.event_type === 'home_anniversary' ) {
        event = eventsByOrgId[extension.rechat_cal_orginal_id]
      }

      return {
        microsoft_id: record.id,
        google_id: null,

        crm_task: (event.object_type === 'crm_task') ? event.id : null,
        contact: (event.object_type === 'deal_context' && event.event_type === 'home_anniversary') ? event.contact : ((event.object_type === 'contact') ? event.id : null),
        contact_attribute: (event.object_type === 'contact_attribute') ? event.id : null,
        deal_context: (event.object_type === 'deal_context') ? event.id : null,

        object_type: event.object_type,
        event_type: event.event_type,
        origin: 'rechat',
        etag: record.change_key,
        local_etag: record.change_key
      }
    })
  
    const result = await CalendarIntegration.insert(records)

    return {
      result
    }
  }

  return {
    error
  }
}

const handleUpdatedEvents = async (credential, events) => {
  let counter = 1

  const remoteEvents = events.map(e => ({
    requestId: counter++,
    cid: e.integrations[0].id,
    eventId: e.integrations[0].microsoftCalEvent.event_id,
    calendar: e.integrations[0].microsoftCal,
    timeZone: e.timeZone,
    sendUpdates: e.resource.sendUpdates,
    resource: e.resource
  }))

  const { microsoftCalEvents, failedIntegrations, error } = await MicrosoftCalendarEvent.batchUpdate(credential, remoteEvents)

  if (microsoftCalEvents) {
    const toUpdateCalIntRecords = microsoftCalEvents.map(event => ({
      microsoft_id: event.id,
      etag: event.change_key,
      local_etag: event.change_key,
      crm_task: null
    }))

    const result = await CalendarIntegration.mupsert(toUpdateCalIntRecords)

    if ( failedIntegrations && failedIntegrations.length > 0 ) {
      const records = await CalendarIntegration.getAll(failedIntegrations)

      const byMicrosoft = records.filter(r => (r.origin === 'microsoft'))
      const byRechat    = records.filter(r => (r.origin === 'rechat'))

      await pruneDeletedMicrosoftEvents(credential, byMicrosoft)
      await pruneOffTrackRechatEvents(byRechat)
    }

    return {
      result
    }
  }

  return {
    error
  }
}

const handleDeletedEvents = async (credential, events) => {
  let counter = 1

  const remoteEvents = events.map(e => ({
    requestId: counter++,
    eventId: e.integrations[0].microsoftCalEvent.event_id,
    calendarId: e.integrations[0].microsoftCal.calendar_id,
    calendar: e.integrations[0].microsoftCal,
    sendUpdates: e.resource.sendUpdates
  }))

  const integrationIds = events.map(e => e.integrations[0].id)

  await MicrosoftCalendarEvent.batchDelete(credential, remoteEvents)
  await CalendarIntegration.deleteMany(integrationIds)
}


module.exports = {
  refineEvents,
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}