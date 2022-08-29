const fixDate = function (input) {
  let output = new Date(input)

  if ( (output.toString() === 'Invalid Date') || (output.getFullYear() < 1800) ) {
    output = new Date(0)
  }

  return output.toISOString()
}

const generateCalendarEvent = function (calendar, event) {
  return {
    google_credential: calendar.google_credential,
    google_calendar: calendar.id,
    event_id: event.id,

    description: event.description || null,
    summary: event.summary || null,
    location: event.location || null,

    color_id: event.colorId || null,
    ical_uid: event.iCalUID || null,
    transparency: event.transparency || null,
    visibility: event.visibility || null,
    hangout_link: event.hangoutLink || null,
    html_link: event.htmlLink || null,
    status: event.status || null,
    sequence: event.sequence || null,

    anyone_can_add_self: event.anyoneCanAddSelf || false,
    guests_can_invite_others: event.guestsCanInviteOthers || false,
    guests_can_modify: event.guestsCanModify || false,
    guests_can_see_other_guests: event.guestsCanSeeOtherGuests || false,
    attendees_omitted: event.attendeesOmitted || false,
    locked: event.locked || false,
    private_copy: event.privateCopy || false,

    creator: JSON.stringify(event.creator),
    organizer: JSON.stringify(event.organizer),
    attendees: JSON.stringify(event.attendees),
    attachments: JSON.stringify(event.attachments),
    conference_data: JSON.stringify(event.conferenceData),
    extended_properties: JSON.stringify(event.extendedProperties),
    gadget: JSON.stringify(event.gadget),
    reminders: JSON.stringify(event.reminders),
    source: JSON.stringify(event.source),

    created: fixDate(event.created),
    updated: event.updated ? fixDate(event.updated) : fixDate(event.created),

    event_start: (event.start) ? JSON.stringify(event.start) : null,
    event_end: (event.end) ? JSON.stringify(event.end) : null,
    end_time_unspecified: event.endTimeUnspecified || false,
    recurrence: JSON.stringify(event.recurrence),
    recurring_event_id: event.recurringEventId || null,
    original_start_time: JSON.stringify(event.originalStartTime),

    etag: event.etag,
    origin: 'google'
  }
}

/** @returns {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
const generateCrmTaskRecord = function (credential, event, oldTask = null) {
  /***  Handle due-date  ***/
  const dueDate = new Date(event.start.date || event.start.dateTime).getTime() / 1000
  const endDate = new Date(event.end.date || event.end.dateTime).getTime() / 1000

  /*
    Tip: Google does not return the reminders' details of events with same date
  */

  /***  Handle reminders  ***/
  let reminders = []

  if ( !event.reminders.useDefault && event.reminders.overrides ) {
    const temp = [event.reminders.overrides[0]]

    reminders = temp.map(record => ({
      timestamp: dueDate - (record.minutes * 60),
      is_relative: true,
    }))
  }

  return {
    brand: credential.brand,
    created_by: credential.user,
    title: event.summary || 'No-Title',
    description: event.description || '',
    due_date: dueDate,
    end_date: (dueDate === endDate) ? undefined : endDate,
    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: oldTask ? oldTask.task_type : 'Other',
    assignees: [credential.user],
    reminders: reminders,
    associations: []
  }
}

const fetchEvents = async function (google, calendar, sameBrandEmails) {
  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const confirmed     = []
  const cancelled     = []

  const confirmedSet  = new Set()
  const cancelledSet  = new Set()

  const { items, nextSyncToken } = await google.syncEvents(calendar.calendar_id, oneYearBefore, calendar.sync_token)

  for (const event of items) {
    if( event.status === 'cancelled' ) {
      if (!cancelledSet.has(event.id)) {
        cancelledSet.add(event.id)
        cancelled.push(event)
      }
    }

    const dueDate = new Date(event.start.date || event.start.dateTime)

    if ( dueDate < oneYearBefore ) {
      continue
    }

    // Skip invitation events which are created by another Google or Outlook account which is already connected with same brand
    if ( event.organizer && !event.organizer.self ) {
      if ( sameBrandEmails.includes(event.organizer.email) ) {
        continue
      }
    }

    // Only pull updates from google_events which are crm_task
    if ( event.extendedProperties && event.extendedProperties.shared ) {
      if ( event.extendedProperties.shared.origin === 'rechat' && event.extendedProperties.shared.object_type !== 'crm_task'  ) {
        continue
      }
    }

    if( event.status === 'confirmed' || event.status === 'tentative' ) {
      if (!confirmedSet.has(event.id)) {
        confirmedSet.add(event.id)
        confirmed.push(event)
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
  generateCalendarEvent,
  generateCrmTaskRecord,
  fetchEvents
}