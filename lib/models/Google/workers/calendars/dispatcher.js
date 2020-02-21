const _    = require('lodash')
const belt = require('../../../../utils/belt')

const Contact             = require('../../../Contact')
const GoogleCalendar      = require('../../calendar')
const GoogleCalendarEvent = require('../../calendar_events')
const CalendarIntegration = require('../../../CalendarIntegration')

const objectTypes = ['crm_task', 'contact', 'contact_attribute', 'deal_context']


// birthdate event, check recurrent fields. 100 times
const generateGoogleCalendarEvent = (event, timezone, contactsById) => {
  let recurrence = event.recurring ? ['RRULE:FREQ=YEARLY;COUNT=25'] : []

  if ( !event.end_date ) {
    event.end_date = event.timestamp
  }

  if ( event.timestamp < event.end_date ) {
    event.timestamp = event.end_date
  }

  let start_date = belt.epochToDate(event.timestamp)
  let end_date   = belt.epochToDate(event.end_date)
  

  if ( event.event_type === 'birthday' ) {
    const currentYear = new Date().getFullYear()
    start_date = new Date(start_date.setFullYear(currentYear))
    end_date   = start_date

    recurrence = ['RRULE:FREQ=YEARLY;COUNT=10']
  }

  const start = {
    date: start_date.toISOString().slice(0,10),
    timeZone: timezone
  }

  const end = {
    date: end_date.toISOString().slice(0,10),
    timeZone: timezone
  }

  const allDay = (event.object_type === 'crm_task') ? false : true

  if (!allDay) {
    delete start.date
    delete end.date

    start.dateTime = start_date.toISOString()
    end.dateTime   = end_date.toISOString()
  }

  let attendees = []

  if (event.people) {
    attendees = event.people.map(p => { if(contactsById[p.id].email) return { 'email': contactsById[p.id].email, 'displayName': contactsById[p.id].display_name } })
  }

  let overrides = []

  if (event.full_crm_task) {
    overrides = event.full_crm_task.reminders.map(r => ({
      method: 'email',
      minutes: Math.round(((r.timestamp * 1000) - (new Date().getTime())) / 1000 / 60)
    }))
  }

  attendees = attendees.slice(0, 10)

  const reminders = {
    useDefault: ( overrides.length > 0 ) ? false : true,
    overrides
  }

  return {
    summary: event.title,
    description: '',
    status: 'confirmed',
    // status: event.deleted_at ? 'cancelled' : 'confirmed',

    start,
    end,
    attendees,
    reminders,

    recurrence,
  
    extendedProperties: {
      shared: {
        origin: 'rechat',
        object_type: event.object_type,
        event_type: event.event_type,
        rechat_cal_event_id: event.id
      }
    }
  }
}

const refinePeople = async (events) => {
  const contactIds = new Set()

  for (const event of events) {
    if (event.people) event.people.map(p => { contactIds.add(p.id) })
  }

  const contacts = await Contact.getAll(Array.from(contactIds))

  return _.keyBy(contacts, 'id')
}

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

  const googleCalendarEventIds = new Set()

  for (const event of events) {
    if ( event.object_type === 'crm_task' ) {
      event.integrations = crmTasksIntRecords.filter(record => event.id === record.crm_task)
    }

    if ( event.object_type === 'contact' ) {
      event.integrations = contactsIntRecords.filter(record => event.id === record.contact)
    }

    if ( event.object_type === 'contact_attribute' ) {
      event.integrations = contactAttsIntRecords.filter(record => event.id === record.contact_attribute)
    }

    if ( event.object_type === 'deal_context' && event.event_type !== 'home_anniversary' ) {
      event.integrations = dealContextsIntRecords.filter(record => (event.id === record.deal_context && event.contact === null))
    }

    if ( event.object_type === 'deal_context' && event.event_type === 'home_anniversary' ) {
      event.integrations = homeAnniversariesIntRecords.filter(record => (event.id === record.deal_context && event.contact === record.contact))
    }

    event.integrations.forEach(function(record) {
      googleCalendarEventIds.add(record.google_id)
    })
  }

  const googleCalEvents = await GoogleCalendarEvent.getAll(Array.from(googleCalendarEventIds))
  const googleCalIds    = [...new Set(googleCalEvents.map(e => e.google_calendar))]
  const googleCalendars = await GoogleCalendar.getAll(googleCalIds)


  return {
    googleCalEventsById: _.keyBy(googleCalEvents, 'id'),
    googleCalendarsById: _.keyBy(googleCalendars, 'id')
  }
}

const refineEvents = async (credential, calEvents, timezone) => {
  const events  = []
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

    events.push(event)
  }

  const contactsById = await refinePeople(events)
  const { googleCalEventsById, googleCalendarsById } = await refineIntegrationRecords(events)

  // level #2 refine
  for (const event of events) {
    for (const record of event.integrations) {      
      record.googleCalEvent = googleCalEventsById[record.google_id]
      record.googleCal      = googleCalendarsById[record.googleCalEvent.google_calendar]
    }

    event.resource = generateGoogleCalendarEvent(event, timezone, contactsById)

    if ( event.deleted_at ) {
      deleted.push(event)
      continue
    }

    if ( event.integrations.length === 0 ) {
      created.push(event)
      continue
    }

    let isUpdated = false

    for (const record of event.integrations) {
      if ( record.googleCal.google_credential === credential.id ) {
        event.integrations = [record]
        updated.push(event)
        isUpdated = true
        break
      }
    }

    if (!isUpdated) {
      created.push(event)
    }
  }

  return {
    created,
    updated,
    deleted
  }
}

const handleCreatedEvents = async (credential, events) => {
  const remoteEvents = []

  const calendar = await GoogleCalendar.get(credential.google_calendar)

  for (const event of events) {
    remoteEvents.push({
      calendarId: calendar.calendar_id,
      resource: event.resource
    })
  }

  const { googleCalEvents, error } = await GoogleCalendarEvent.bulkInsert(calendar, remoteEvents)

  const records = googleCalEvents.map((record, index) => {
    return {
      google_id: record.id,
      microsoft_id: null,
    
      crm_task: (events[index].object_type === 'crm_task') ? events[index].id : null,
      contact: (events[index].object_type === 'deal_context' && events[index].event_type === 'home_anniversary') ? events[index].contact : ((events[index].object_type === 'contact') ? events[index].id : null),
      contact_attribute: (events[index].object_type === 'contact_attribute') ? events[index].id : null,
      deal_context: (events[index].object_type === 'deal_context') ? events[index].id : null,
    
      object_type: events[index].object_type,
      event_type: events[index].event_type,
      origin: 'rechat'
    }
  })

  const result = await CalendarIntegration.insert(records)

  return {
    result,
    error
  }
}

const handleUpdatedEvents = async (credential, events) => {
  const remoteEvents = []

  const calendar = await GoogleCalendar.get(credential.google_calendar)

  for (const event of events) {
    remoteEvents.push({
      eventId: event.integrations[0].googleCalEvent.event_id,
      calendarId: calendar.calendar_id,
      resource: event.resource
    })
  }

  const { googleCalEvents, error } = await GoogleCalendarEvent.bulkUpdate(calendar, remoteEvents)

  return {
    googleCalEvents,
    error
  }
}

const handleDeletedEvents = async (credential, events) => {
  const integrationIds = []
  const promises       = []

  for (const event of events) {
    for (const record of event.integrations) {
      const googleCalEvent = record.googleCalEvent
      const googleCal      = record.googleCal

      if ( googleCal.google_credential === credential.id ) {
        promises.push(GoogleCalendarEvent.delete(googleCalEvent.id, googleCal))
        integrationIds.push(record.id)
        break
      }
    }
  }

  console.log('handleDeletedEvents integrationIds', integrationIds)

  await Promise.all(promises)
  await CalendarIntegration.deleteMany(integrationIds)
}


module.exports = {
  refineEvents,
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}