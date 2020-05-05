const _ = require('lodash')
const config = require('../../../../../config')

const openExt = config.microsoft_integration.openExtension



const getEvents = async function (microsoft, calendar, timeZone) {
  const oneYearBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  const tenYearsAfter = new Date(new Date().setFullYear(new Date().getFullYear() + 10))

  const startdatetime = oneYearBefore.toISOString()
  const enddatetime   = tenYearsAfter.toISOString()

  const initialLink = `https://graph.microsoft.com/v1.0/me/calendars/${calendar.calendar_id}/calendarView/delta?startdatetime=${startdatetime}&enddatetime=${enddatetime}`
  const url = calendar.delta_token ? calendar.delta_token : initialLink

  return await microsoft.delta(url, timeZone)
}

const getExtended = async function (microsoft, calendar, events, populated = false) {
  const select   = '$select=id,subject'
  const expand   = `$expand=extensions($filter=id eq '${openExt.calendar.name}')`
  const query    = populated ? `?${expand}` : `?${select}&${expand}`
  const eventIds = events.map(event => event.id)

  let counter = 1

  const chunks = eventIds.map(id => {
    return {
      'id': counter++,
      'method': 'GET',
      'url': `/me/calendars/${calendar.calendar_id}/events/${id}/${query}`
    }
  })

  const result   = await microsoft.batchGetEvents(chunks)
  const extended = result.filter(record => (record.status === 200)).map(record => record.body)
  const byId     = _.keyBy(extended, 'id')

  return byId
}


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
    event_start: JSON.stringify(event.start),
    event_end: JSON.stringify(event.end),

    body_preview: event.bodyPreview,
    body: JSON.stringify(event.body),
    attendees: JSON.stringify(event.attendees),
    recurrence: JSON.stringify(event.recurrence),
    is_all_day: event.isAllDay,
    is_cancelled: event.isCancelled,
    is_organizer: event.isOrganizer,
    reminder_minutes_before_start: event.reminderMinutesBeforeStart,

    location: JSON.stringify(event.location),
    locations: JSON.stringify(event.locations),
    organizer: JSON.stringify(event.organizer),
    categories: JSON.stringify(event.categories),
    response_status: JSON.stringify(event.responseStatus),
    extensions: JSON.stringify(event.extensions),

    has_attachments: event.hasAttachments,
    is_reminder_on: event.isReminderOn,
    response_requested: event.responseRequested,
    ical_uid: event.iCalUId,
    importance: event.importance,
    online_meeting_url: event.onlineMeetingUrl,
    sensitivity: event.sensitivity,
    series_master_id: event.seriesMasterId,
    show_as: event.showAs,
    web_link: event.webLink,
    origin: 'microsoft'
  }
}

/** @returns {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
const generateCrmTask = function (credential, event) {
  /***  Handle due-date  ***/
  let dueDate = new Date(event.start.dateTime)
  let endDate = new Date(event.end.dateTime)

  console.log('--- event', event)

  if (event.isAllDay) {
    dueDate.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)
  }

  console.log('--- dueDate', dueDate)
  console.log('--- endDate', endDate)

  const dueDateTs = dueDate.getTime() / 1000
  const endDateTs = endDate.getTime() / 1000


  /***  Handle reminders  ***/
  let reminders = [{
    is_relative: true,
    timestamp: dueDateTs - (30 * 60)
  }]

  if ( !event.isReminderOn && event.reminderMinutesBeforeStart ) {
    reminders = [{
      is_relative: true,
      timestamp: dueDateTs - (event.reminderMinutesBeforeStart * 60)
    }]
  }

  return {
    brand: credential.brand,
    created_by: credential.user,
    title: event.subject || '',
    description: event.body_preview || '',
    due_date: dueDateTs,
    end_date: (dueDateTs === endDateTs) ? dueDateTs : endDateTs,
    status: (dueDateTs > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',
    task_type: 'Other',
    assignees: [credential.user],
    reminders: reminders,
    associations: []
  }
}

const fetchEvents = async function (microsoft, calendar, sameBrandEmails, timeZone) {
  const confirmed = []
  const cancelled = []
  const masterIds = []

  const { delta, values } = await getEvents(microsoft, calendar, timeZone)
  const extendedById      = await getExtended(microsoft, calendar, values, true)

  for (const event of values) {
    if( event['@removed'] || event.isCancelled ) {
      cancelled.push(event)
      continue
    }

    // Skip invitation events which are created by another Google or Outlook account which is already connected with same brand
    if ( !event.is_organizer && event.organizer && event.organizer.emailAddress ) {
      if ( sameBrandEmails.includes(event.organizer.emailAddress.address) ) {
        continue
      }
    }

    if (extendedById[event.id]) {
      event.extensions = extendedById[event.id].extensions || []

      const byId = _.keyBy(event.extensions, 'id')
      const ext  = byId[openExt.calendar.id]

      if ( ext && ext.shared && ext.origin === 'rechat' && ext.object_type !== 'crm_task' ) {
        continue
      }
 
      // skip seriesMaster events
      if ( event.type === 'seriesMaster' ) {
        masterIds.push(event.id)
        continue
      }

      confirmed.push(extendedById[event.id])
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