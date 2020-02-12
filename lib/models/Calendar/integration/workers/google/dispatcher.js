const belt = require('../../../../../utils/belt')
// const Context = require('../../../../Context')

const GoogleCalendar      = require('../../../../Google/calendar')
const GoogleCalendarEvent = require('../../../../Google/calendar_events')
const CalendarIntegration = require('../../index')

const objectTypes = ['crm_task', 'contact', 'contact_attribute', 'deal_context']



const generateGoogleCalendarEvent = async (event, timezone) => {
  // const Contact    = require('../../../../Contact')
  // const contactIds = event.people.map(p => p.id)
  // const contacts   = await Contact.getAll(contactIds)
  // const attendees  = contacts.map(c => ({ 'email': c.email, 'displayName': c.display_name }))

  const allDay     = (event.object_type === 'crm_task') ? false : true
  const start_date = belt.epochToDate(event.timestamp)
  const end_date   = belt.epochToDate(event.end_date)

  const start = {
    date: start_date.toISOString().slice(0,10),
    timeZone: timezone // 'America/Los_Angeles'
  }

  const end = {
    date: end_date.toISOString().slice(0,10),
    timeZone: 'America/Los_Angeles'
  }

  if (!allDay) {
    delete start.date
    delete end.date

    start.dateTime = start_date.toISOString()
    end.dateTime   = end_date.toISOString()
  }


  // check refrences object to reduce DB-IO-Call
  const attendees = event.people.map(p => ({ 'email': p.email, 'displayName': p.display_name }))

  const overrides = event.full_crm_task.reminders.map(r => ({
    method: 'email',
    minutes: Math.round(((r.timestamp * 1000) - (new Date().getTime())) / 1000 / 60)
  }))

  const reminders = {
    useDefault: ( overrides.length > 0 ) ? false : true,
    overrides
  }


  return {
    summary: event.title,
    description: '',
    status: (event.status === 'DONE') ? 'cancelled' : 'confirmed',

    start,
    end,
    attendees,
    reminders,
  
    extendedProperties: {
      shared: {
        origin: 'rechat',
        object_type: event.object_type,
        event_type: event.event_type
      }
    }
  }
}

const refineEvents = async (credential, events, timezone) => {
  const created = []
  const updated = []
  const deleted = []

  for (const event of events) {
    if ( !objectTypes.includes(event.object_type) ) {
      continue
    }

    event.integrations = []

    if ( event.object_type === 'crm_task' ) {
      event.integrations = await CalendarIntegration.getByCrmTask(event.id)
    }

    if ( event.object_type === 'contact' ) {
      event.integrations = await CalendarIntegration.getByContact(event.id)
    }

    if ( event.object_type === 'contact_attribute' ) {
      event.integrations = await CalendarIntegration.getByContactAttribute(event.id)
    }

    if ( event.object_type === 'deal_context' ) {
      event.integrations = await CalendarIntegration.getByDealContext(event.id)
    }

    for (const record of event.integrations) {
      record.googleCalEvent = await GoogleCalendarEvent.get(record.google_id)
      record.googleCal      = await GoogleCalendar.get(record.googleCalEvent.google_calendar)
    }

    event.resource = await generateGoogleCalendarEvent(event, timezone)


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
  const records  = []
  const calendar = await GoogleCalendar.get(credential.google_calendar)

  for (const event of events) {
    const { id } = await GoogleCalendarEvent.create(calendar, event.resource)

    records.push({
      google_id: id,
      microsoft_id: null,

      crm_task: (event.object_type === 'crm_task') ? event.id : null,
      contact: (event.object_type === 'contact') ? event.id : null,
      contact_attribute: (event.object_type === 'contact_attribute') ? event.id : null,
      deal_context: (event.object_type === 'deal_context') ? event.id : null,

      object_type: event.object_type,
      event_type: event.event_type,
      origin: 'rechat'
    })
  }

  await CalendarIntegration.insert(records)
}

const handleUpdatedEvents = async (events) => {
  for (const event of events) {   
    const googleCalEvent = event.integrations[0].googleCalEvent
    const googleCal      = event.integrations[0].googleCal

    // const { status, local, remote }
    await GoogleCalendarEvent.update(googleCalEvent.id, googleCal, event.resource)
  }
}

const handleDeletedEvents = async (credential, events) => {
  const integrationIds = []

  for (const event of events) {
    for (const record of event.integrations) {
      const googleCalEvent = record.googleCalEvent
      const googleCal      = record.googleCal

      if ( googleCal.google_credential === credential.id ) {
        await GoogleCalendarEvent.delete(googleCalEvent.id, googleCal)
        integrationIds.push(record.id)
        break
      }
    }
  }

  await CalendarIntegration.deleteMany(integrationIds)
}


module.exports = {
  refineEvents,
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}