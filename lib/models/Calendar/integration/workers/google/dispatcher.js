const Context = require('../../../../Context')

const GoogleCalendar      = require('../../../../Google/calendar')
const GoogleCalendarEvent = require('../../../../Google/calendar_events')
const CalendarIntegration = require('../../index')

const { generateGoogleCalendarEvent } = require('./common')



const handleCreatedEvents = async(credential, events) => {
  for (const event of events) {
    const resource = await generateGoogleCalendarEvent(event)
    const calendar = await GoogleCalendar.get(credential.google_calendar)

    const { id } = await GoogleCalendarEvent.create(calendar, resource)

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
    const resource     = await generateGoogleCalendarEvent(event)
    const integrations = await CalendarIntegration.getByCrmTask(event.id)
    
    for (const record of integrations) {
      const googleCalEvent = await GoogleCalendarEvent.get(record.google_id)
      const googleCal      = await GoogleCalendar.get(googleCalEvent.google_calendar)

      if ( googleCal.google_credential !== credential.id ) {
        Context.log('---- handleUpdatedEvents, credentials miss-match', credential.id, event.id)
        continue
      }

      // const { status, local, remote }
      await GoogleCalendarEvent.update(googleCalEvent.id, googleCal, resource)
    }
  }
}

const handleDeletedEvents = async(credential, events) => { 
  for (const event of events) {
    const integrations = await CalendarIntegration.getByCrmTask(event.id)

    for (const record of integrations) {
      const googleCalEvent = await GoogleCalendarEvent.get(record.google_id)
      const googleCal      = await GoogleCalendar.get(googleCalEvent.google_calendar)

      if ( googleCal.google_credential !== credential.id ) {
        Context.log('---- handleDeletedEvents, credentials miss-match', credential.id, event.id)
        continue
      }

      await GoogleCalendarEvent.delete(googleCalEvent.id, googleCal)
    }

    const ids = integrations.map(record => record.id)
    await CalendarIntegration.deleteMany(ids)
  }
}


module.exports = {
  handleCreatedEvents,
  handleUpdatedEvents,
  handleDeletedEvents
}