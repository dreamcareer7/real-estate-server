// @ts-nocheck
const config = require('../../../config')
const CREDENTIALS = config.google_integration.credential


function Google(){
  this.credentials   = CREDENTIALS
  this.client_secret = CREDENTIALS.client_secret
  this.client_id     = CREDENTIALS.client_id
}


// Profile
Google.prototype.getGmailProfile = async function () {
  return {}
}


// History
Google.prototype.discreteHistory = async function* (limit, currentHistoryId = null) {
  yield {}
}

Google.prototype.history = async function (currentHistoryId = null) {
  return {}
}


// Threads
Google.prototype.discreteSyncThreads = async function* () {
  yield {}
}

Google.prototype.syncThreads = async function () {
  return {}
}

Google.prototype.getThread = async function (threadId) {
  return {}
}

Google.prototype.searchThreads = async function (limit, query, page) {
  return {}
}


// Messages
Google.prototype.discreteSyncMessages = async function* (limit) {
  yield {}
}

Google.prototype.syncMessages = async function () {
  return {
    'messages': [
      {
        'id': '16f80a53a53bd334',
        'threadId': '16f80a53a53bd334'
      },
      {
        'id': '16f2e66fd16dbec3',
        'threadId': '16f2e64f21335232'
      },
      {
        'id': '16f2e65dfa9688ee',
        'threadId': '16f2e64f21335232'
      }
    ],
    'resultSizeEstimate': 5
  }
}

Google.prototype.batchGetMessages = async function (messages, fields) {
  const message = await new Google().getMessage()
  return [
    message
  ]
}

Google.prototype.getMessage = async function (messageId) {
  return {
    'id': '16f80a53a53bd334',
    'threadId': '16f80a53a53bd334',
    'labelIds': [
      'CATEGORY_PERSONAL',
      'INBOX'
    ],
    'snippet': 'snippet',
    'historyId': '22516',
    'internalDate': '1578411308000',
    'payload': {
      'partId': '',
      'mimeType': 'multipart/alternative',
      'filename': '',
      'headers': [
        {
          'name': 'Delivered-To',
          'value': 'heshmat.zapata@gmail.com'
        },
        {
          'name': 'Received',
          'value': 'by 2002:a92:8108:0:0:0:0:0 with SMTP id e8csp335862ild;        Tue, 7 Jan 2020 07:35:10 -0800 (PST)'
        },
        {
          'name': 'Message-ID',
          'value': '\u003cVlEW4BZ5au1FqKMQdjHbJg.0@notifications.google.com\u003e'
        },
        {
          'name': 'Subject',
          'value': 'schedule gmail message'
        },
        {
          'name': 'From',
          'value': 'Google \u003cno-reply@accounts.google.com\u003e'
        },
        {
          'name': 'To',
          'value': 'heshmat.zapata@gmail.com'
        },
        {
          'name': 'Content-Type',
          'value': 'multipart/alternative; boundary=0000000000006bd743059b8e85e1'
        }
      ],
      'body': {
        'size': 0
      },
      'parts': [
        {
          'partId': '0',
          'mimeType': 'multipart/alternative',
          'filename': '',
          'headers': [
            {
              'name': 'Content-Type',
              'value': 'multipart/alternative; boundary=0000000000009fb9b9059ba2cf57'
            }
          ],
          'body': {
            'size': 0
          },
          'parts': [
            {
              'partId': '0.0',
              'mimeType': 'text/plain',
              'filename': '',
              'headers': [{
                'name': 'Content-Type',
                'value': 'text/plain; charset=UTF-8'
              }],
              'body': {
                'size': 2,
                'data': 'DQo='
              }
            },
            {
              'partId': '0.1',
              'mimeType': 'text/html',
              'filename': '',
              'headers': [
                {
                  'name': 'Content-Type',
                  'value': 'text/html; charset=UTF-8'
                },
                {
                  'name': 'Content-Transfer-Encoding',
                  'value': 'quoted-printable'
                }
              ],
              'body': {
                'size': 286,
                'data': 'VGhpcyBpcyB0aGUgZW1haWwgYm9keQ=='
              }
            }
          ]
        },
        {
          'partId': '1',
          'mimeType': 'text/plain',
          'filename': 'attachment.txt',
          'headers': [
            {
              'name': 'Content-Type',
              'value': 'text/plain; charset=US-ASCII; name=attachment.txt'
            },
            {
              'name': 'Content-Disposition',
              'value': 'attachment; filename=attachment.txt'
            },
            {
              'name': 'Content-Transfer-Encoding',
              'value': 'base64'
            },
            {
              'name': 'Content-ID',
              'value': '\u003cf_k55h7d9i0\u003e'
            },
            {
              'name': 'X-Attachment-Id',
              'value': 'f_k55h7d9i0'
            }
          ],
          'body': {
            'attachmentId': 'ANGjdJ87NVHSljeMm8ha4hcQhN7YCmUewUJm6ys2M50lMrbSw6T3QaFJB7Kd7-gqII8wK_9yQG7BptgpBy0KKXbuuSUFkka2wCnoG-reGVSPtSQIAEaIcIiQ-nl6isrDyUMIuv2KeUDuJODZ5QOl7eHSbMMtUpG36eGYc0hH5_2pWmOE2v08e9pDnZp_keYZ_qpcFHv1-ORNul06CmvM6t3OYf3gEu-dFPEkRNZE0xPl2UgUVYA_YBMq8MflYpvGUgD45S1Tx7yqToOAY1QOxR6cuLKVU24MKdRIVrTbrMMpqEE4BKH5yRpzRv0Pfv1CcyTMI6mkQ_G8WP0D2GMW7ltvnJR59IZREoyejbvIVk1fzLUXNgcQqCMM748wobnxogCOyY1O5T9atpbzDp6s',
            'size': 11
          }
        },
        {
          'partId': '2',
          'mimeType': 'image/jpeg',
          'filename': 'attachment.jpg',
          'headers': [
            {
              'name': 'Content-Type',
              'value': 'image/jpeg; name=attachment.jpg'
            },
            {
              'name': 'Content-Disposition',
              'value': 'attachment; filename=attachment.jpg'
            },
            {
              'name': 'Content-Transfer-Encoding',
              'value': 'base64'
            },
            {
              'name': 'Content-ID',
              'value': '\u003cf_k55h7dae1\u003e'
            },
            {
              'name': 'X-Attachment-Id',
              'value': 'f_k55h7dae1'
            }
          ],
          'body': {
            'attachmentId': 'ANGjdJ9wN-R-8ghU0LfK79MsqQDKN9zQKOMkD1Sw1lsgsV5GEHuyY5kH-RJxf1steZmfYCgoOG6NC1eWOBSM3zoWW0S-KGa9U0cK2vLwashbMIxN9G7qT4cSJEJ7usJ1Bfq3uv1S51JNY3e-4kWqhyKOW0jT2tH6POl5LyQEVdI5TLKaAfu2OKmBRSfiXFkzOkAKxeWXoPQpbCI79E5Pbkc6WKKuLTM1_6yoT_0_9srC2WdhGcM_NdgsgHqXzMdOOQ_jYwVwkbkFrY5FMBritaUZ-boqBrdFf2sRf5sFXzPiSYzTCTWdEkHoqQlbeQOM2LotvkoYiDI4O_VtLUdpqb23-eAAwVGjHGHPciO3XaLHnVJ0Fx00MhJXX34hs6ypfUUw4qNEcw4NFrRztYe8',
            'size': 23747
          }
        }
      ]
    },
    'sizeEstimate': 11104
  }
}

Google.prototype.getAttachment = async function (messageId, attachmentId) {
  return {}
}

Google.prototype.searchMessage = async function (limit, query, next) {
  return {}
}

Google.prototype.sendMessage = async function (email) {
  return {}
}

Google.prototype.sendMessageWithAttachment = async function (email) {
  return {}
}

Google.prototype.sendMultipartMessage = async function (body) {
  return {
    id: '16f80a53a53bd334'
  }
}

Google.prototype.batchModify = async function (messageIds, labelsToAdd, labelsToRemove) {
  return {}
}

Google.prototype.modify = async function (messageId, labelsToAdd, labelsToRemove) {
  return {}
}

Google.prototype.updateReadStatus = async function(messageIds, status) {
  return true
}

Google.prototype.watchMailBox = async function (topicName = null) {
  return { historyId: '24753', expiration: '1579959900549' }
}

Google.prototype.stopWatchMailBox = async function () {
  return 204
}

Google.prototype.moveToTrash = async function () {
  return {}
}

Google.prototype.untrashMessage = async function () {
  return {}
}

Google.prototype.batchTrash = async function () {
  return 202
}

Google.prototype.batchArchive = async function () {
  return 202
}


// Lables
Google.prototype.listLabels = async function () {
  return {}
}


// People, Contacts (pageSize: between 1 and 2000, inclusive. Defaults to 100)
Google.prototype.getProfile = async function () {
  return {}
}

Google.prototype.listConnections = async function (currentSyncToken = null) {
  return {}
}

Google.prototype.listContactGroups = async function (currentSyncToken = null) {
  return {}
}


// conatacts api v3
Google.prototype.getContactGroups = async function () {
  return {}
}

Google.prototype.getContacts = async function (path) {
  return {}
}

Google.prototype.getContactPhoto = async function (url) {
  return {}
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
        'id': 'fmtchvkhb14p00dri5pgq7hsdg@group.calendar.google.com',
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
    id: options.requestBody.id,
    resourceId: 'XNV9Kaby25G5Vq6RttltAjG7Ok0',
    resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/b3q1jsv64qvf79om73stjl01hc@group.calendar.google.com/events?maxResults=250&alt=json',
    token: 'b215445e-ee05-4761-a4ec-085a164426ba',
    expiration: '1578918090000'
  }
}

Google.prototype.stopWatchCalendar = async function (options) {
  return true
}


// Calendar Events
Google.prototype.listEvents = async function (calendarId) {
}

Google.prototype.syncEvents = async function (calendarId, timeMin, currentSyncToken = null) {
}

Google.prototype.createEvent = async function (calendarId, resource, sendUpdates = 'none') {
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

Google.prototype.batchInsertEvent = async function (events) {
  return {
    confirmed: [],
    error: null
  }
}

Google.prototype.batchUpdateEvent = async function (events) {
  return {
    confirmed: [],
    error: null
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

Google.prototype.updateEvent = async function (calendarId, eventId, resource, sendUpdates = 'none') {
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

Google.prototype.deleteEvent = async function (calendarId, eventId, sendUpdates = 'none') {
  return true
}

Google.prototype.batchDeleteEvents = async function (events) {
  return 200
}


module.exports.setupClient = async function () {
  return new Google()
}