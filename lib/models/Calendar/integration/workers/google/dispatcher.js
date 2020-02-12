// const Context = require('../../../../Context')

const GoogleCalendar      = require('../../../../Google/calendar')
const GoogleCalendarEvent = require('../../../../Google/calendar_events')
const CalendarIntegration = require('../../index')

const generateGoogleCalendarEvent = require('./common')


const refineEvents = async(credential, events) => {
  const created = []
  const updated = []
  const deleted = []

  for (const event of events) {
    event.resource = await generateGoogleCalendarEvent(event)

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



    if ( event.deleted_at ) {
      deleted.push(event)
      continue
    }

    if ( event.integrations.length === 0 ) {
      created.push(event)
    }

    for (const record of event.integrations) {
      record.googleCalEvent = await GoogleCalendarEvent.get(record.google_id)
      record.googleCal      = await GoogleCalendar.get(record.googleCalEvent.google_calendar)

      if ( record.googleCal.google_credential !== credential.id ) {
        created.push(event)

      } else {

        updated.push(event)
      }
    }
  }

  return {
    created,
    updated,
    deleted
  }
}

const handleCreatedEvents = async(credential, events) => {
  const calendar = await GoogleCalendar.get(credential.google_calendar)

  for (const event of events) {
    const { id } = await GoogleCalendarEvent.create(calendar, event.resource)

    const record = {
      google_id: id,
      microsoft_id: null,

      crm_task: event.id,
      contact: null,
      contact_attribute: null,
      deal_context: null,

      object_type: event.object_type,
      event_type: event.event_type,
      origin: 'rechat'
    }

    await CalendarIntegration.insert([record])
  }
}

const handleUpdatedEvents = async(credential, events) => {
  for (const event of events) {   
    for (const record of event.integrations) {
      const googleCalEvent = record.googleCalEvent
      const googleCal      = record.googleCal

      if ( googleCal.google_credential !== credential.id ) {
        continue
      }

      // const { status, local, remote }
      await GoogleCalendarEvent.update(googleCalEvent.id, googleCal, event.resource)
    }
  }
}

const handleDeletedEvents = async(credential, events) => { 
  for (const event of events) {
    for (const record of event.integrations) {
      const googleCalEvent = record.googleCalEvent
      const googleCal      = record.googleCal

      if ( googleCal.google_credential !== credential.id ) {
        continue
      }

      await GoogleCalendarEvent.delete(googleCalEvent.id, googleCal)
    }

    const ids = event.integrations.map(record => record.id)
    await CalendarIntegration.deleteMany(ids)
  }
}


module.exports = {
  refineEvents,
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}