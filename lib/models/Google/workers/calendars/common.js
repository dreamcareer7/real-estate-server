// @ts-nocheck
const GoogleCalendar = require('../../calendar')


const getToSyncCalendars = async function (gcid) {
  const calendars = await GoogleCalendar.getAllByGoogleCredential(gcid)

  const toSync = calendars.filter(cal => cal.watcher_status !== 'stopped')

  return toSync
}

const generateCalendarEventRecord = function (calendar, event) {
  return {
    google_credential: calendar.google_credential,
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
    recurring_event_id: event.recurring_event_id || null,
    original_start_time: JSON.stringify(event.original_start_time),
    
    origin: 'google'
  }
}

/** @returns {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
const generateCrmTaskRecord = function (credential, event) {
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
      timestamp: dueDate - (record.minutes * 60),
      is_relative: true,
    }))
  }

  return {
    brand: credential.brand,
    created_by: credential.user,
    title: event.summary || '',
    description: event.description || '',
    due_date: dueDate,
    end_date: endDate,
    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: 'Other',
    assignees: [credential.user],
    reminders: reminders,
    associations: []
  }
}

const fetchEvents = async function (google, calendar) {
  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const confirmed     = []
  const cancelled     = []

  const confirmedSet  = new Set()
  const cancelledSet  = new Set()

  const { items, nextSyncToken } = await google.syncEvents(calendar.calendar_id, oneYearBefore, calendar.sync_token)

  for (const event of items) {

    const dueDate = new Date(event.start.date || event.start.dateTime)

    if ( dueDate < oneYearBefore )
      continue

    if( event.status === 'confirmed' || event.status === 'tentative' ) {
      if (!confirmedSet.has(event.id)) {
        confirmedSet.add(event.id)
        confirmed.push(event)
      }
    }

    if( event.status === 'cancelled' ) {
      if (!cancelledSet.has(event.id)) {
        cancelledSet.add(event.id)
        cancelled.push(event)
      }
    }
  }

  return {
    confirmed,
    cancelled,
    nextSyncToken
  }
}


module.exports = {
  generateCalendarEventRecord,
  generateCrmTaskRecord,
  getToSyncCalendars,
  fetchEvents
}