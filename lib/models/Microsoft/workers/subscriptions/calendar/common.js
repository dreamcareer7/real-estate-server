// @ts-nocheck

const generateCalendarEvent = function (calendar, event) {
  return {
    microsoft_credential: calendar.microsoft_credential,
    microsoft_calendar: calendar.id,
    event_id: event.id,
    subject: event.subject,
    type: event.type,
    change_key: event.changeKey,

    created_date_time: event.createdDateTime,
    last_modified_date_time: event.lastModifiedDateTime,
    original_end_time_zone: event.originalEndTimeZone,
    original_start_time_zone: event.originalStartTimeZone,
    event_start: JSON.stringify(event.start) || null,
    event_end: JSON.stringify(event.end) || null,

    body_preview: event.bodyPreview,
    body: JSON.stringify(event.body) || true,
    attendees: JSON.stringify(event.attendees) || false,
    recurrence: JSON.stringify(event.recurrence) || false,
    is_all_day: event.isAllDay,
    is_cancelled: event.isCancelled,
    is_organizer: event.isOrganizer,
    reminder_minutes_before_start: event.reminderMinutesBeforeStart,

    location: JSON.stringify(event.location) || null,
    locations: JSON.stringify(event.locations) || false,
    organizer: JSON.stringify(event.organizer) || true,
    categories: JSON.stringify(event.categories) || false,
    response_status: JSON.stringify(event.responseStatus) || false,
    has_attachments: event.hasAttachments,
    is_reminderOn: event.isReminderOn,
    response_requested: event.responseRequested,
    ical_uid: event.iCalUId,
    importance: event.importance,
    online_meeting_url: event.onlineMeetingUrl,
    sensitivity: event.sensitivity,
    series_masterId: event.seriesMasterId,
    show_as: event.showAs,
    web_link: event.webLink,
    origin: 'microsoft'
  }
}

/** @returns {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
const generateCrmTask = function (credential, event) {
  /***  Handle due-date  ***/
  const dueDate = new Date(event.start.dateTime).getTime() / 1000
  const endDate = new Date(event.end.dateTime).getTime() / 1000

  /***  Handle reminders  ***/
  let reminders = [{
    is_relative: true,
    timestamp: dueDate - (30 * 60)
  }]

  if ( !event.isReminderOn && event.reminderMinutesBeforeStart ) {
    reminders = [{
      is_relative: true,
      timestamp: dueDate - (event.reminderMinutesBeforeStart * 60)
    }]
  }

  return {
    brand: credential.brand,
    created_by: credential.user,
    title: event.subject || '',
    description: event.body_preview || '',
    due_date: dueDate,
    end_date: (dueDate === endDate) ? null : endDate,
    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: 'Other',
    assignees: [credential.user],
    reminders: reminders,
    associations: []
  }
}

const fetchEvents = async function (microsoft, calendar) {
  const confirmed     = []
  const cancelled     = []

  const confirmedSet  = new Set()
  const cancelledSet  = new Set()

  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const tenYearsAfter = new Date(new Date().setFullYear(new Date().getFullYear() + 10))

  const startdatetime = oneYearBefore.toISOString()
  const enddatetime   = tenYearsAfter.toISOString()

  const initialLink = `https://graph.microsoft.com/v1.0/me/calendars/${calendar.calendar_id}/calendarView/delta?startdatetime=${startdatetime}&enddatetime=${enddatetime}`
  const url = calendar.delta_token ? calendar.delta_token : initialLink

  const { delta, values } = await microsoft.delta(url)

  for (const event of values) {

    // Only pull updates from google_events which are crm_task
    // if ( event.extendedProperties && event.extendedProperties.shared ) {
    //   if ( event.extendedProperties.shared.origin === 'rechat' && event.extendedProperties.shared.object_type !== 'crm_task'  ) {
    //     continue
    //   }
    // }

    if( event['@removed'] ) {
      if (!cancelledSet.has(event.id)) {
        cancelledSet.add(event.id)
        cancelled.push(event)
      }

    } else {

      if (!confirmedSet.has(event.id)) {
        confirmedSet.add(event.id)
        confirmed.push(event)
      }
    }
  }

  return {
    confirmed,
    cancelled,
    delta
  }
}



module.exports = {
  generateCalendarEvent,
  generateCrmTask,
  fetchEvents
}