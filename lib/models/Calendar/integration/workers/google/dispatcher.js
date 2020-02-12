// const Context = require('../../../../Context')

const GoogleCalendar      = require('../../../../Google/calendar')
const GoogleCalendarEvent = require('../../../../Google/calendar_events')
const CalendarIntegration = require('../../index')

const generateGoogleCalendarEvent = require('./common')

const objectTypes = ['crm_task', 'contact', 'contact_attribute', 'deal_context']



const refineEvents = async(credential, events, timezone) => {
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

const handleCreatedEvents = async(credential, events) => {
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

const handleUpdatedEvents = async(credential, events) => {
  for (const event of events) {   
    const googleCalEvent = event.integrations[0].googleCalEvent
    const googleCal      = event.integrations[0].googleCal

    // const { status, local, remote }
    await GoogleCalendarEvent.update(googleCalEvent.id, googleCal, event.resource)
  }
}

const handleDeletedEvents = async(credential, events) => {
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