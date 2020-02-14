const _    = require('lodash')
const belt = require('../../../../../utils/belt')
// const Context = require('../../../../Context')

const Contact             = require('../../../../Contact')
const GoogleCalendar      = require('../../../../Google/calendar')
const GoogleCalendarEvent = require('../../../../Google/calendar_events')
const CalendarIntegration = require('../../index')

const objectTypes = ['crm_task', 'contact', 'contact_attribute', 'deal_context']



const generateGoogleCalendarEvent = (event, timezone, contactsById) => {
  if ( !event.end_date ) {
    event.end_date = event.timestamp
  }

  if ( event.timestamp < event.end_date ) {
    event.timestamp = event.end_date
  }

  const allDay     = (event.object_type === 'crm_task') ? false : true
  const start_date = belt.epochToDate(event.timestamp)
  const end_date   = belt.epochToDate(event.end_date)

  const start = {
    date: start_date.toISOString().slice(0,10),
    timeZone: timezone
  }

  const end = {
    date: end_date.toISOString().slice(0,10),
    timeZone: timezone
  }

  if (!allDay) {
    delete start.date
    delete end.date

    start.dateTime = start_date.toISOString()
    end.dateTime   = end_date.toISOString()
  }


  let attendees = []

  if (event.people) {
    // check refrences object to reduce DB-IO-Call
    attendees = event.people.map(p => ({ 'email': contactsById[p.id].email, 'displayName': contactsById[p.id].display_name }))
  }

  let overrides = []

  if (event.full_crm_task) {
    overrides = event.full_crm_task.reminders.map(r => ({
      method: 'email',
      minutes: Math.round(((r.timestamp * 1000) - (new Date().getTime())) / 1000 / 60)
    }))
  }

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

const refinePeople = async (events) => {
  const contactIds = new Set()

  for (const event of events) {
    if (event.people) event.people.map(p => { contactIds.add(p.id) })
  }

  const contacts = await Contact.getAll(Array.from(contactIds))

  return _.keyBy(contacts, 'id')
}

const refineIntegrationRecords = async (events) => {
  const crmTaskIds     = events.filter(e => e.object_type === 'crm_task').map(e => e.id)
  const contactIds     = events.filter(e => e.object_type === 'contact').map(e => e.id)
  const contactAttIds  = events.filter(e => e.object_type === 'contact_attribute').map(e => e.id)
  const dealContextIds = events.filter(e => e.object_type === 'deal_context').map(e => e.id)

  const crmTaskssIntRecords     = await CalendarIntegration.getByCrmTasks(crmTaskIds)
  const contactssIntRecords     = await CalendarIntegration.getByContacts(contactIds)
  const contactAttssIntRecords  = await CalendarIntegration.getByContactAttributes(contactAttIds)
  const dealContextssIntRecords = await CalendarIntegration.getByDealContexts(dealContextIds)

  for (const event of events) {

    if ( event.object_type === 'crm_task' ) {
      event.integrations = crmTaskssIntRecords.filter(record => event.id === record.crm_task)
    }

    if ( event.object_type === 'contact' ) {
      event.integrations = contactssIntRecords.filter(record => event.id === record.contact)
    }

    if ( event.object_type === 'contact_attribute' ) {
      event.integrations = contactAttssIntRecords.filter(record => event.id === record.contact_attribute)
    }

    if ( event.object_type === 'deal_context' ) {
      event.integrations = dealContextssIntRecords.filter(record => event.id === record.deal_context)
    }

    console.log('event.integrations', event.integrations)
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

    if ( event.object_type === 'deal_context' ) {
      event.orginal_id = event.id
      event.id = event.id.split(':')[1]
    } else {
      events.push(event)
    }
  }

  const contactsById = await refinePeople(events)
  await refineIntegrationRecords(events)

  // level #2 refine
  for (const event of events) {
    console.log('xxxxx', event)
    for (const record of event.integrations) {
      record.googleCalEvent = await GoogleCalendarEvent.get(record.google_id)
      record.googleCal      = await GoogleCalendar.get(record.googleCalEvent.google_calendar)
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
  const records  = []
  const calendar = await GoogleCalendar.get(credential.google_calendar)

  for (const event of events) {
    // handle any exception and delete created remote event
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

  const res = await CalendarIntegration.insert(records)
  console.log('---- res', res)
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