// const config  = require('../../../../config')
// const sq      = require('../../../../utils/squel_extensions')
// const Context = require('../../../Context')

const Contact        = require('../../../Contact/index')
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

    "attendees": [
      {
        "email": "saeed@rechat.com",
        "responseStatus": "needsAction"
      },
      {
        "email": "saeed.uni68@gmail.com",
        "responseStatus": "needsAction"
      }
    ],

    "reminders": {
      "useDefault": false,
      "overrides": [
        {
          "method": "popup",
          "minutes": 900
        },
        {
          "method": "popup",
          "minutes": 9540
        }
      ]
    }

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

  Repeated-Single
  {
    "kind": "calendar#event",
    "etag": "\"3143551288948000\"",
    "id": "6phgle50pq7677jbilj4e19u91",
    "status": "confirmed",
    "htmlLink": "https://www.google.com/calendar/event?eid=NnBoZ2xlNTBwcTc2NzdqYmlsajRlMTl1OTFfMjAxOTEwMDgganFxOGI1MWgwcmZkdWpvNG9mdGVkNTZ1cWNAZw",
    "created": "2019-10-22T20:20:44.000Z",
    "updated": "2019-10-22T20:20:44.474Z",
    "summary": "repeated",
    "creator": {
      "email": "heshmat.zapata@gmail.com"
    },
    "organizer": {
      "email": "jqq8b51h0rfdujo4ofted56uqc@group.calendar.google.com",
      "displayName": "calendar-summary",
      "self": true
    },
    "start": {
      "date": "2019-10-08"
    },
    "end": {
      "date": "2019-10-09"
    },
    "recurrence": [
      "RRULE:FREQ=DAILY;COUNT=3"
    ],
    "transparency": "transparent",
    "iCalUID": "6phgle50pq7677jbilj4e19u91@google.com",
    "sequence": 0,
    "reminders": {
      "useDefault": true
    }
  }

  Repeated-Expanded
  {
    "id": "6phgle50pq7677jbilj4e19u91_20191008",
    "status": "confirmed",
    "created": "2019-10-22T20:20:44.000Z",
    "updated": "2019-10-22T20:20:44.474Z",
    "summary": "repeated",
    "start": { "date": "2019-10-08" },
    "end": { "date": "2019-10-09" },
    "recurringEventId": "6phgle50pq7677jbilj4e19u91",
    "originalStartTime": { "date": "2019-10-08" },
    "transparency": "transparent",
  },
  {
    "id": "6phgle50pq7677jbilj4e19u91_20191009",
    "status": "confirmed",
    "created": "2019-10-22T20:20:44.000Z",
    "updated": "2019-10-22T20:20:44.474Z",
    "summary": "repeated",

    "start": { "date": "2019-10-09" },
    "end": { "date": "2019-10-10" },
    "recurringEventId": "6phgle50pq7677jbilj4e19u91",
    "originalStartTime": { "date": "2019-10-09" },
    "transparency": "transparent",
  },
  {
    "id": "6phgle50pq7677jbilj4e19u91_20191010",
    "status": "confirmed",
    "created": "2019-10-22T20:20:44.000Z",
    "updated": "2019-10-22T20:20:44.474Z",
    "summary": "repeated",
    "start": { "date": "2019-10-10" },
    "end": { "date": "2019-10-11" },
    "recurringEventId": "6phgle50pq7677jbilj4e19u91",
    "originalStartTime": { "date": "2019-10-10" },
    "transparency": "transparent",
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

const generateCRMTaskRecord = async function (googleCredential, event, attendees) {
  const dueDate = new Date(event.start.date || event.start.dateTime).getTime() / 1000
  const endDate = new Date(event.end.date || event.end.dateTime).getTime() / 1000

  let reminders = [{
    is_relative: true,
    timestamp: dueDate - (30 * 60)
  }]

  if ( !event.reminders.useDefault ) {
    reminders = event.reminders.overrides.map(record => ({
      is_relative: true,
      timestamp: dueDate - (record.minutes * 60)
    }))
  }


  const options = event.attendees.map(record => ({
    attribute_type: 'email',
    value: record.email
  }))

  const result = await Contact.fastFilter(googleCredential.brand, options, { filter_type: 'or' })
  
  const associations = result.ids.map(contactId => ({
    association_type: 'contact',
    contact: contactId
  }))  


  /** @type {ITaskInput[]} */
  return {
    created_by: googleCredential.user,
    brand: googleCredential.brand,
    title: event.title,
    description: event.description,

    due_date: dueDate,
    end_date: endDate,

    status: (dueDate > ( new Date().getTime() / 1000 )) ? 'PENDING' : 'DONE',

    task_type: 'Other',

    assignees: [googleCredential.user],
    associations: associations,
    reminders: reminders
  }
}

const getToSyncCalendars = async function (googleCredentialId) {
  const toSync = []

  const calendars = await GoogleCalendar.getAllByGoogleCredential(googleCredentialId)

  for (const cal of calendars) {
    if ( !cal.deleted && !cal.deleted_at )
      toSync.push(cal)
  }

  return toSync
}

const fetchEvents = async function (google, calendar) {
  // const max = config.google_sync.max_sync_calendar_events_num
  // const UTS = new Date().setMonth(new Date().getMonth() - config.google_sync.backward_month_num) // setFullYear, getFullYear
  // const checkingDate = event.created || event.updated

  const twoYearsBefore = new Date(new Date().setFullYear(new Date().getFullYear() - 2))

  const confirmed = []
  const cancelled = []

  const { items, nextSyncToken } = await google.syncEvents(calendar.calendar_id, calendar.sync_token)

  for (const event of items) {

    const dueDate = new Date(event.start.date || event.start.dateTime)

    if ( dueDate < twoYearsBefore )
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