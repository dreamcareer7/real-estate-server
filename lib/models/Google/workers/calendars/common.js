// const config  = require('../../../../config')
// const sq      = require('../../../../utils/squel_extensions')
// const Context = require('../../../Context')

const GoogleCalendar = require('../../calendar')


/*
  {
    "status": string,
    "summary": string,
    "description": string,
    "location": string,
    "colorId": string,

    "start": {
      "date": date,
      "dateTime": datetime,
      "timeZone": string
    },
    "end": {
      "date": date,
      "dateTime": datetime,
      "timeZone": string
    },
    "endTimeUnspecified": boolean,

    "recurrence": [
      string
    ],
    "recurringEventId": string,

    "originalStartTime": {
      "date": date,
      "dateTime": datetime,
      "timeZone": string
    },


    "reminders": {
      "useDefault": boolean,
      "overrides": [
        {
          "method": string,
          "minutes": integer
        }
      ]
    },

    "attachments": [
      {
        "fileUrl": string,
        "title": string,
        "mimeType": string,
        "iconLink": string,
        "fileId": string
      }
    ]
  }

  {
    summary: 'Google I/O 2019',
    location: '800 Howard St., San Francisco, CA 94103',
    description: 'A chance to hear more about Google\'s developer products.',
    start: {
      dateTime: '2019-10-20T09:00:00-07:00',
      timeZone: 'America/Los_Angeles'
    },
    end: {
      dateTime: '2019-10-20T11:00:00-07:00',
      timeZone: 'America/Los_Angeles'
    },
    recurrence: [
      'RRULE:FREQ=DAILY;COUNT=2'
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 }
      ]
    }
  }
*/

const generateCalendarEventRecord = async function (googleCredentialId, calendar, event) {
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
    
    start: JSON.stringify(event.start),
    end: JSON.stringify(event.end),
    end_time_unspecified: event.end_time_unspecified || false,
    recurrence: JSON.stringify(event.recurrence),
    recurring_eventId: event.recurring_eventId || null,
    original_start_time: JSON.stringify(event.original_start_time),
    
    origin: 'google'
  }
}

const getToSyncCalendars = async function (googleCredentialId) {
  const toSync = []

  const calendars = await GoogleCalendar.getAllByGoogleCredential(googleCredentialId)

  for (const cal of calendars) {
    if ( !cal.deleted && !cal.deleted_at )
      toSync.push(cal.calendar_id)
  }

  return toSync
}

const fetchEvents = async function (google, calendar) {
  // const max = config.google_sync.max_sync_calendar_events_num
  // const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num) // setFullYear, getFullYear
  // const checkingDate = event.created || event.updated

  const confirmed = []
  const cancelled = []

  const { items, nextSyncToken } = await google.syncEvents(calendar.calendar_id, calendar.sync_token)

  for (const event of items) {
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
  getToSyncCalendars,
  fetchEvents
}