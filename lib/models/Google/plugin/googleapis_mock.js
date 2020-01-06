// @ts-nocheck
const config = require('../../../config')
const CREDENTIALS = config.google_integration.credential


function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.client_secret
  this.client_id     = CREDENTIALS.client_id
}



// Calendar
Google.prototype.listCalendars = async function () {
  return {
    'kind': 'calendar#calendarList',
    'etag': 'p330cllf3oviuc0g',
    'nextSyncToken': 'CMDK1ePH5eYCEhhoZXNobWF0LnphcGF0YUBnbWFpbC5jb20=',
    'items': [
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577988301342000',
        'id': 'my_gmail@gmail.com',
        'summary': 'my_gmail@gmail.com',
        'timeZone': 'Asia/Tehran',
        'colorId': '5',
        'backgroundColor': '#ff7537',
        'foregroundColor': '#000000',
        'accessRole': 'writer',
        'defaultReminders': [],
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      },
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577989290347000',
        'id': 'gep9kvv67ad7ntt415ac59q4ug@group.calendar.google.com',
        'summary': 'Rechat',
        'description': 'rechat-cal-description',
        'location': 'Chicago',
        'timeZone': 'America/Chicago',
        'colorId': '3',
        'backgroundColor': '#f83a22',
        'foregroundColor': '#000000',
        'selected': true,
        'accessRole': 'owner',
        'defaultReminders': [],
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      },
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577990252488000',
        'id': 'my_gmail_2@gmail.com',
        'summary': 'my_gmail_2@gmail.com',
        'timeZone': 'America/New_York',
        'colorId': '11',
        'backgroundColor': '#fbe983',
        'foregroundColor': '#000000',
        'selected': true,
        'deleted': true,
        'accessRole': 'owner',
        'defaultReminders': [{
          'method': 'popup',
          'minutes': 30
        }],
        'notificationSettings': {
          'notifications': [
            {
              'type': 'eventCreation',
              'method': 'email'
            },
            {
              'type': 'eventChange',
              'method': 'email'
            },
            {
              'type': 'eventCancellation',
              'method': 'email'
            },
            {
              'type': 'eventResponse',
              'method': 'email'
            }
          ]
        },
        'primary': true,
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      },
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577990249170000',
        'id': 'addressbook#contacts@group.v.calendar.google.com',
        'summary': 'Contacts',
        'timeZone': 'America/New_York',
        'summaryOverride': 'Contacts-Birthdays',
        'colorId': '13',
        'backgroundColor': '#92e1c0',
        'foregroundColor': '#000000',
        'selected': true,
        'accessRole': 'reader',
        'defaultReminders': [],
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      },
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577988652114000',
        'id': 'en.islamic#holiday@group.v.calendar.google.com',
        'summary': 'Muslim Holidays',
        'timeZone': 'America/New_York',
        'colorId': '8',
        'backgroundColor': '#16a765',
        'foregroundColor': '#000000',
        'accessRole': 'reader',
        'defaultReminders': [],
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      },
      {
        'kind': 'calendar#calendarListEntry',
        'etag': '1577973996780000',
        'id': 'en.usa#holiday@group.v.calendar.google.com',
        'summary': 'Holidays in United States',
        'timeZone': 'America/New_York',
        'colorId': '8',
        'backgroundColor': '#16a765',
        'foregroundColor': '#000000',
        'selected': true,
        'accessRole': 'reader',
        'defaultReminders': [],
        'conferenceProperties': {
          'allowedConferenceSolutionTypes': [
            'eventHangout'
          ]
        }
      }
    ]
  }
}

Google.prototype.createCalendar = async function (resource) {
  return {
    kind: 'calendar#calendar',
    etag: 'tUbYNIo-tXTdSmtErt2XEdA9ULM',
    id: 'fmtchvkhb14p00dri5pgq7hsdg@group.calendar.google.com',
    summary: resource.summary,
    description: resource.description,
    timeZone: 'UTC',
    conferenceProperties: { allowedConferenceSolutionTypes: [ 'eventHangout' ] }
  }
}

Google.prototype.getCalendarList = async function (calendarId) {
}

Google.prototype.getCalendar = async function (calendarId) {
}

Google.prototype.updateCalendar = async function (calendarId, resource) {
  return {
    id: calendarId,
    ...resource
  }
}

Google.prototype.deleteCalendar = async function (calendarId) {
}

Google.prototype.watchCalendar = async function (options) {
  return {
    kind: 'api#channel',
    id: '1c3803c4-3192-4a18-b548-baea3f0dd1e4',
    resourceId: 'XNV9Kaby25G5Vq6RttltAjG7Ok0',
    resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/b3q1jsv64qvf79om73stjl01hc@group.calendar.google.com/events?maxResults=250&alt=json',
    token: 'b215445e-ee05-4761-a4ec-085a164426ba',
    expiration: '1578918090000'
  }
}

Google.prototype.stopWatchCalendar = async function (options) {
  return
}


// Calendar Events
Google.prototype.listEvents = async function (calendarId) {
}

Google.prototype.syncEvents = async function (calendarId, timeMin, currentSyncToken = null) {
}

Google.prototype.createEvent = async function (calendarId, resource) {
  return {
    kind: 'calendar#event',
    etag: '3142350064046000',
    id: 'xxxyyyzzzz',
    status: 'confirmed',
    htmlLink: 'https://www.google.com/calendar/event?eid=....',
    created: '2019-10-15T21:30:31.000Z',
    updated: '2019-10-15T21:30:32.068Z',
    summary: resource.summary,
    description: resource.description,
    location: resource.location,
    creator: { email: 'my_gmail@gmail.com', self: true },
    organizer: { email: 'my_gmail@gmail.com', self: true },
    start: resource.start,
    end: resource.end,
    iCalUID: 'xxxyyyzzzz@google.com',
    sequence: 0,
    reminders: resource.reminders
  }
}

Google.prototype.getEvent = async function (calendarId, eventId) {
  return {
    kind: 'calendar#event',
    etag: '3142350064046000',
    id: eventId,
    status: 'confirmed',
    htmlLink: 'https://www.google.com/calendar/event?eid=....',
    created: new Date(),
    updated: new Date(),
    summary: 'summary',
    description: 'description',
    location: 'location',
    creator: { email: 'my_gmail@gmail.com', self: true },
    organizer: { email: 'my_gmail@gmail.com', self: true },
    iCalUID: 'xxxyyyzzzz@google.com',
    sequence: 0,
    reminders: { useDefault: true }
  }
}

Google.prototype.getEventInstances = async function (calendarId, eventId, options) {
}

Google.prototype.updateEvent = async function (calendarId, eventId, resource) {
  return {
    kind: 'calendar#event',
    etag: '3142350064046000',
    id: eventId,
    status: 'confirmed',
    htmlLink: 'https://www.google.com/calendar/event?eid=....',
    created: '2019-10-15T21:30:31.000Z',
    updated: '2019-10-15T21:30:32.068Z',
    summary: resource.summary,
    description: resource.description,
    location: resource.location,
    creator: { email: 'my_gmail@gmail.com', self: true },
    organizer: { email: 'my_gmail@gmail.com', self: true },
    start: resource.start,
    end: resource.end,
    iCalUID: 'xxxyyyzzzz@google.com',
    sequence: 0,
    reminders: resource.reminders
  }
}

Google.prototype.deleteEvent = async function (calendarId, eventId) {
  return true
}



module.exports.setupClient = async function () {
  return new Google()
}