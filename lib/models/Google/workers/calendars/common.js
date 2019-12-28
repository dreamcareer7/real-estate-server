// @ts-nocheck
const Contact        = require('../../../Contact/index')
const GoogleCalendar = require('../../calendar')


const getToSyncCalendars = async function (googleCredentialId) {
  const toSync = []

  const calendars = await GoogleCalendar.getAllByGoogleCredential(googleCredentialId)

  for (const cal of calendars) {
    if ( cal.watcher_status !== 'stopped' )
      toSync.push(cal)
  }

  return toSync
}

const generateCalendarEventRecord = function (googleCredentialId, calendar, event) {
  return {
    google_credential: googleCredentialId,
    google_calendar: calendar.id,
    event_id: event.id,

    description: event.description || null,
    summary: event.summary || null,
    location: event.location || null,

    color_id: event.color_id || null,
    ical_uid: event.ical_uid || null,
    transparency: event.transparency || null,
    visibility: event.visibility || null,
    hangout_link: event.hangout_link || null,
    html_link: event.html_link || null,
    status: event.status || null,
    sequence: event.sequence || null,

    anyone_can_add_self: event.anyone_can_add_self || false,
    guests_can_invite_others: event.guests_can_invite_others || false,
    guests_can_modify: event.guests_can_modify || false,
    guests_can_see_other_guests: event.guests_can_see_other_guests || false,
    attendees_omitted: event.attendees_omitted || false,
    locked: event.locked || false,
    private_copy: event.private_copy || false,
    
    creator: JSON.stringify(event.creator),
    organizer: JSON.stringify(event.organizer),
    attendees: JSON.stringify(event.attendees),
    attachments: JSON.stringify(event.attachments),
    conference_data: JSON.stringify(event.conference_data),
    extended_properties: JSON.stringify(event.extended_properties),
    gadget: JSON.stringify(event.gadget),
    reminders: JSON.stringify(event.reminders),
    source: JSON.stringify(event.source),

    created: event.created || false,
    updated: event.updated || event.created,

    event_start: (event.start) ? JSON.stringify(event.start) : null,
    event_end: (event.end) ? JSON.stringify(event.end) : null,
    end_time_unspecified: event.end_time_unspecified || false,
    recurrence: JSON.stringify(event.recurrence),
    recurring_eventId: event.recurring_eventId || null,
    original_start_time: JSON.stringify(event.original_start_time),
    
    origin: 'google'
  }
}

/** @returns {ITaskInput} */
const generateCRMTaskRecord = async function (googleCredential, event) {
  /***  Handle due-date  ***/
  const dueDate = new Date(event.start.date || event.start.dateTime).getTime() / 1000
  const endDate = new Date(event.end.date || event.end.dateTime).getTime() / 1000

  /***  Handle reminders  ***/
  let reminders = [{
    is_relative: true,
    timestamp: dueDate - (30 * 60)
  }]

  if ( !event.reminders.useDefault && event.reminders.overrides ) {
    reminders = event.reminders.overrides.map(record => ({
      timestamp: (dueDate - (record.minutes * 60)) * 1000,
      is_relative: true,
    }))
  }


  /***  Handle contact associations  ***/
  let options = []

  if (event.attendees) {
    options = event.attendees.map(record => ({
      attribute_type: 'email',
      value: record.email
    }))
  }

  const result = await Contact.fastFilter(googleCredential.brand, options, { filter_type: 'or' })
  
  const associations = result.ids.map(contactId => ({
    association_type: 'contact',
    contact: contactId
  }))  


  return {
    brand: googleCredential.brand,
    created_by: googleCredential.user,
    title: event.summary || '',
    description: event.description || '',
    due_date: dueDate,
    end_date: endDate,
    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: 'Other',
    reminders: reminders,
    associations: associations,
    assignees: [googleCredential.user],
    gcalendar_event_id: null,
    origin: 'google'
  }
}

const fetchEvents = async function (google, calendar) {
  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const confirmed     = []
  const cancelled     = []

  const { items, nextSyncToken } = await google.syncEvents(calendar.calendar_id, oneYearBefore, calendar.sync_token)

  for (const event of items) {

    const dueDate = new Date(event.start.date || event.start.dateTime)

    if ( dueDate < oneYearBefore )
      continue

    if( event.status === 'confirmed' || event.status === 'tentative' )
      confirmed.push(event)

    if( event.status === 'cancelled' )
      cancelled.push(event)
  }

  return {
    confirmed,
    cancelled,
    nextSyncToken
  }
}


module.exports = {
  generateCalendarEventRecord,
  generateCRMTaskRecord,
  getToSyncCalendars,
  fetchEvents
}