const config = require('../../../config')
const CREDENTIALS = config.microsoft_integration.credential


function MGraph(){
  this.credentials   = CREDENTIALS
  this.client_id     = CREDENTIALS.client_id
  this.client_secret = CREDENTIALS.client_secret
  this.auth_uri      = CREDENTIALS.auth_uri
  this.redirect_uri  = CREDENTIALS.redirect_to_uri

  this.response_type = 'code'
  this.response_mode = 'query'
  this.prompt        = 'login'
}


// Profile
MGraph.prototype.getProfileNative = async function() {
  return {}
}

MGraph.prototype.getProfile = async function() {
  return {}
}

MGraph.prototype.getProfileAvatar = async function () {
  return {}
}


// Labels
MGraph.prototype.listFolders = async function(query) {
  return {
    vBeta: {},
    vOne: {}
  }
}


// Message
MGraph.prototype.getAttachmentNative = async function() {
  return {}
}

MGraph.prototype.geMessagesNative = async function(query) {
  return true
}

MGraph.prototype.geMessagesByUrl = async function(url) {
  return true
}

MGraph.prototype.createMessage = async function() {
  return {}
}

MGraph.prototype.updateMessage = async function() {
  return {}
}

MGraph.prototype.sendMessage = async function() {
  return {}
}

MGraph.prototype.deleteDraft = async function() {
  return {}
}

MGraph.prototype.createReply = async function() {
  return {}
}

MGraph.prototype.addAttachmentNative = async function() {
  return {}
}

MGraph.prototype.updateMessageExtensionsNative = async function() {
  return {}
}

MGraph.prototype.updateIsRead = async function(messageIds, status) {
  return {}
}

MGraph.prototype.batchDelete = async function(messageIds) {
  return 202
}

MGraph.prototype.searchThreads = async function(messageIds, status) {
  return {}
}

MGraph.prototype.uploadSession = async function(messageId, attachment) {
  return true
}

// Subscription
MGraph.prototype.subscription = async function(messageId) {
  return {
    '@odata.context': 'https://graph.microsoft.com/beta/$metadata#subscriptions/$entity',
    'id': '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
    'resource': 'me/messages', // me/mailFolders('Inbox')/messages
    'applicationId': '24d3b144-21ae-4080-943f-7067b395b913',
    'changeType': 'created,updated',
    'clientState': 'secretClientValue',
    'notificationUrl': 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    'expirationDateTime': '2016-11-20T18:23:45.9356913Z',
    'creatorId': '8ee44408-0679-472c-bc2a-692812af3437'
  }
}

MGraph.prototype.listSubscriptions = async function() {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#subscriptions',
    'value': [
      {
        '@odata.context': 'https://graph.microsoft.com/beta/$metadata#subscriptions/$entity',
        'id': '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
        'resource': 'me/messages', // me/mailFolders('Inbox')/messages
        'applicationId': '24d3b144-21ae-4080-943f-7067b395b913',
        'changeType': 'created,updated',
        'clientState': 'secretClientValue',
        'notificationUrl': 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
        'expirationDateTime': '2016-11-20T18:23:45.9356913Z',
        'creatorId': '8ee44408-0679-472c-bc2a-692812af3437'
      }
    ]
  }
}

MGraph.prototype.getSubscription = async function(id) {
  return {
    '@odata.context': 'https://graph.microsoft.com/beta/$metadata#subscriptions/$entity',
    'id': '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
    'resource': 'me/messages', // me/mailFolders('Inbox')/messages
    'applicationId': '24d3b144-21ae-4080-943f-7067b395b913',
    'changeType': 'created,updated',
    'clientState': 'secretClientValue',
    'notificationUrl': 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    'expirationDateTime': '2016-11-20T18:23:45.9356913Z',
    'creatorId': '8ee44408-0679-472c-bc2a-692812af3437'
  }
}

MGraph.prototype.createSubscription = async function(parmas) {
  return {
    '@odata.context': 'https://graph.microsoft.com/beta/$metadata#subscriptions/$entity',
    'id': '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
    'resource': 'me/messages', // me/mailFolders('Inbox')/messages
    'applicationId': '24d3b144-21ae-4080-943f-7067b395b913',
    'changeType': 'created,updated',
    'clientState': 'secretClientValue',
    'notificationUrl': 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    'expirationDateTime': '2016-11-20T18:23:45.9356913Z',
    'creatorId': '8ee44408-0679-472c-bc2a-692812af3437'
  }
}

MGraph.prototype.updateSubscription = async function(id, parmas) {
  return {
    '@odata.context': 'https://graph.microsoft.com/beta/$metadata#subscriptions/$entity',
    'id': '7f105c7d-2dc5-4530-97cd-4e7ae6534c07',
    'resource': 'me/messages', // me/mailFolders('Inbox')/messages
    'applicationId': '24d3b144-21ae-4080-943f-7067b395b913',
    'changeType': 'created,updated',
    'clientState': 'secretClientValue',
    'notificationUrl': 'https://webhook.azurewebsites.net/api/send/myNotifyClient',
    'expirationDateTime': '2016-11-20T18:23:45.9356913Z',
    'creatorId': '8ee44408-0679-472c-bc2a-692812af3437'
  }
}

MGraph.prototype.deleteSubscription = async function(id) {
  return true
}

MGraph.prototype.batchDeleteSubscription = async function(subIds) {
  return 
}


// Calendar
MGraph.prototype.listCalendars = async function() {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars',
    'value': [
      {
        id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AAAAABELAAA=',
        name: 'Calendar',
        color: 'auto',
        changeKey: 'wtrCk4zkjU6bIuSiBdYqegAAAAAB+g==',
        canShare: true,
        canViewPrivateItems: true,
        canEdit: true,
        owner: { name: 'Samantha Booth', address: 'samanthab@adatum.onmicrosoft.com' }
      },
      {
        id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AACnadrAAAA=',
        name: 'United States holidays',
        color: 'auto',
        changeKey: 'wtrCk4zkjU6bIuSiBdYqegAAp2Y8tw==',
        canShare: false,
        canViewPrivateItems: true,
        canEdit: false,
        owner: { name: 'Samantha Booth', address: 'samanthab@adatum.onmicrosoft.com' }
      },
      {
        id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AADjjrzdAAA=',
        name: 'Birthdays',
        color: 'auto',
        changeKey: 'wtrCk4zkjU6bIuSiBdYqegAA44IPdg==',
        canShare: false,
        canViewPrivateItems: true,
        canEdit: false,
        owner: { name: 'Samantha Booth', address: 'samanthab@adatum.onmicrosoft.com' }
      },
      {
        id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEGAADC2sKTjOSNTpsi5KIF1ip6AAEph2NtAAA=',
        name: 'Calendar',
        color: 'auto',
        changeKey: 'wtrCk4zkjU6bIuSiBdYqegABKW5A7g==',
        canShare: true,
        canViewPrivateItems: true,
        canEdit: true,
        owner: { name: 'Samantha Booth', address: 'samanthab@adatum.onmicrosoft.com' }
      }
    ]
  }
}

MGraph.prototype.createCalendar = async function(calendar) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars/$entity',
    '@odata.id': 'https://graph.microsoft.com/v1.0/users(ddfcd489-628b-40d7-b48b-57002df800e5@1717622f-1d94-4d0c-9d74-709fad664b77)calendars(AAMkAGI2TGuLAAA=)',
    'id': 'AAMkAGI2TGuLAAA=',
    'name': 'Calendar',
    'color': 'auto',
    'changeKey': 'nfZyf7VcrEKLNoU37KWlkQAAA0x0+w==',
    'canShare': true,
    'canViewPrivateItems': true,
    'canEdit': true,
    'owner': {
      'name': 'Samantha Booth',
      'address': 'samanthab@adatum.onmicrosoft.com'
    }
  }
}

MGraph.prototype.getCalendar = async function(calendarId) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars/$entity',
    '@odata.id': 'https://graph.microsoft.com/v1.0/users(ddfcd489-628b-40d7-b48b-57002df800e5@1717622f-1d94-4d0c-9d74-709fad664b77)calendars(AAMkAGI2TGuLAAA=)',
    'id': 'AAMkAGI2TGuLAAA=',
    'name': 'Calendar',
    'color': 'auto',
    'changeKey': 'nfZyf7VcrEKLNoU37KWlkQAAA0x0+w==',
    'canShare': true,
    'canViewPrivateItems': true,
    'canEdit': true,
    'owner': {
      'name': 'Samantha Booth',
      'address': 'samanthab@adatum.onmicrosoft.com'
    }
  }
}

MGraph.prototype.updateCalendar = async function(calendarId, calendar) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#me/calendars/$entity',
    '@odata.id': 'https://graph.microsoft.com/v1.0/users(266efe5a-0fd7-4edd-877b-b2d1e561f193@ae01a323-3934-4475-a32d-af1274312bb0)calendars(AAMkADJmMVAAA=)',
    'id': 'AAMkADJmMVAAA=',
    'name': 'Social events',
    'color': 'auto',
    'changeKey': 'DxYSthXJXEWwAQSYQnXvIgAAIxGttg==',
    'canShare': true,
    'canViewPrivateItems': true,
    'canEdit': true,
    'owner': {
      'name': 'Samantha Booth',
      'address': 'samanthab@adatum.onmicrosoft.com'
    }
  }
}

MGraph.prototype.deleteCalendar = async function(calendarId) {
  return true
}

// Calendar Events
MGraph.prototype.syncEvents = async function (calendarId, timeMin, currentSyncToken = null) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(cd209b0b-3f83-4c35-82d2-d88a61820480)/events(subject,body,bodyPreview,organizer,attendees,start,end,location)',
    'value': [
      {
        '@odata.etag': 'WZlnW4RIAV06KYYwlrfNZvQAAKGWwbw==',
        'id': 'AAMkAGIAAAoZDOFAAA=',
        'subject': 'Orientation ',
        'bodyPreview': 'Dana, this is the time you selected for our orientation. Please bring the notes I sent you.',
        'body': {
          'contentType': 'html',
          'content': '<html><head></head><body><p>Dana, this is the time you selected for our orientation. Please bring the notes I sent you.</p></body></html>'
        },
        'start': {
          'dateTime': '2017-04-21T10:00:00.0000000',
          'timeZone': 'Pacific Standard Time'
        },
        'end': {
          'dateTime': '2017-04-21T12:00:00.0000000',
          'timeZone': 'Pacific Standard Time'
        },
        'location': {
          'displayName': 'Assembly Hall',
          'locationType': 'default',
          'uniqueId': 'Assembly Hall',
          'uniqueIdType': 'private'
        },
        'locations': [
          {
            'displayName': 'Assembly Hall',
            'locationType': 'default',
            'uniqueIdType': 'unknown'
          }
        ],
        'attendees': [
          {
            'type': 'required',
            'status': {
              'response': 'none',
              'time': '0001-01-01T00:00:00Z'
            },
            'emailAddress': {
              'name': 'Samantha Booth',
              'address': 'samanthab@a830edad905084922E17020313.onmicrosoft.com'
            }
          },
          {
            'type': 'required',
            'status': {
              'response': 'none',
              'time': '0001-01-01T00:00:00Z'
            },
            'emailAddress': {
              'name': 'Dana Swope',
              'address': 'danas@a830edad905084922E17020313.onmicrosoft.com'
            }
          }
        ],
        'organizer': {
          'emailAddress': {
            'name': 'Samantha Booth',
            'address': 'samanthab@a830edad905084922E17020313.onmicrosoft.com'
          }
        }
      }
    ]
  }
}

MGraph.prototype.createEvent = async function (calendarId, event) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(919717da-0460-4cca-a6be-d25382429896)/events/$entity',
    '@odata.etag': 'W+T8RDneHMkKe2BGYEaQZ4wAA5a9Acw==',
    'id': 'AAMkADQwMD',
    'createdDateTime': '2017-10-07T04:59:12.9698856Z',
    'lastModifiedDateTime': '2017-10-07T04:59:13.8136423Z',
    'changeKey': '+T8RDneHMkKe2BGYEaQZ4wAA5a9Acw==',
    'categories': [],
    'originalStartTimeZone': 'Pacific Standard Time',
    'originalEndTimeZone': 'Pacific Standard Time',
    'iCalUId': '040000008200E00074C5B7101A82E0080000000028CEBE04293FD3010000000000000000100000009F85AB8AF8ED4D4FAC777FA89954BDB7',
    'reminderMinutesBeforeStart': 15,
    'isReminderOn': true,
    'hasAttachments': false,
    'subject': 'Lets go for lunch',
    'bodyPreview': 'Does late morning work for you?',
    'importance': 'normal',
    'sensitivity': 'normal',
    'isAllDay': false,
    'isCancelled': false,
    'isOrganizer': true,
    'responseRequested': true,
    'seriesMasterId': null,
    'showAs': 'busy',
    'type': 'seriesMaster',
    'webLink': 'https://outlook.office365.com/owa/?itemid=AAMkADQwMD&exvsurl=1&path=/calendar/item',
    'onlineMeetingUrl': null,
    'responseStatus': {
      'response': 'organizer',
      'time': '0001-01-01T00:00:00Z'
    },
    'body': {
      'contentType': 'html',
      'content': '<html>\r\n<head>\r\n<meta http-equiv=\'Content-Type\' content=\'text/html; charset=utf-8\'>\r\n<meta content=\'text/html; charset=us-ascii\'>\r\n</head>\r\n<body>\r\nDoes late morning work for you?\r\n</body>\r\n</html>\r\n'
    },
    'start': {
      'dateTime': '2017-09-04T12:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'end': {
      'dateTime': '2017-09-04T14:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'location': {
      'displayName': 'Harrys Bar',
      'locationType': 'default',
      'uniqueId': 'Harrys Bar',
      'uniqueIdType': 'private'
    },
    'locations': [
      {
        'displayName': 'Harrys Bar',
        'locationType': 'default',
        'uniqueIdType': 'unknown'
      }
    ],
    'recurrence': {
      'pattern': {
        'type': 'weekly',
        'interval': 1,
        'month': 0,
        ' dayOfMonth': 0,
        'daysOfWeek': [
          'monday'
        ],
        'firstDayOfWeek': 'sunday',
        'index': 'first'
      },
      'range': {
        'type': 'endDate',
        'startDate': '2017-09-04',
        'endDate': '2017-12-31',
        'recurrenceTimeZone': 'Pacific Standard Time',
        'numberOfOccurrences': 0
      }
    },
    'attendees': [
      {
        'type': 'required',
        'status': {
          'response': 'none',
          'time': '0001-01-01T00:00:00Z'
        },
        'emailAddress': {
          'name': 'Adele Vance',
          'address': 'AdeleV@contoso.onmicrosoft.com'
        }
      }
    ],
    'organizer': {
      'emailAddress': {
        'name': 'Alex Wilber',
        'address': 'AlexW@contoso.onmicrosoft.com'
      }
    },
    'OnlineMeeting': null
  }
}

MGraph.prototype.batchInsertEvent = async function (events) {
  return {
    confirmed: [],
    failed: []
  }
}

MGraph.prototype.batchUpdateEvent = async function (events) {
  return {
    confirmed: [],
    failed: []
  }
}

MGraph.prototype.batchDeleteEvents = async function (events) {
  return {
    failed: []
  }
}

MGraph.prototype.getEventInstances = async function (calendarId, eventId, startDateTime, endDateTime) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(bb8775a4-4d8c-42cf-a1d4-4d58c2bb668f)/events(AAMkAGUzYRgWAAA%3D)/instances(subject,bodyPreview,seriesMasterId,type,recurrence,start,end)',
    'value': [
      {
        '@odata.etag': 'Wx3IAvB5fbUWf4XNcBFLNUwAAKuA3yQ==',
        'id': 'AAMkAGUzYAgI1sE1TatAAEYAAAAAlNFb2CNPe0ucP9you',
        'subject': 'Review strategy for Q3',
        'bodyPreview': 'Changing meeting from 4/15 to 4/16.',
        'seriesMasterId': 'AAMkAGUzYRgWAAA=',
        'type': 'exception',
        'recurrence': null,
        'start': {
          'dateTime': '2019-04-16T20:30:00.0000000',
          'timeZone': 'UTC'
        },
        'end': {
          'dateTime': '2019-04-16T21:00:00.0000000',
          'timeZone': 'UTC'
        }
      },
      {
        '@odata.etag': 'Wx3IAvB5fbUWf4XNcBFLNUwAAKuA3yQ==',
        'id': 'AAMkAGUzYAgI1ru1JMcAAEYAAAAAlNFb2CNPe0ucP9you',
        'subject': 'Review strategy for Q3',
        'bodyPreview': '',
        'seriesMasterId': 'AAMkAGUzYRgWAAA=',
        'type': 'occurrence',
        'recurrence': null,
        'start': {
          'dateTime': '2019-04-08T20:30:00.0000000',
          'timeZone': 'UTC'
        },
        'end': {
          'dateTime': '2019-04-08T21:00:00.0000000',
          'timeZone': 'UTC'
        }
      },
      {
        '@odata.etag': 'Wx3IAvB5fbUWf4XNcBFLNUwAAKuA3yQ==',
        'id': 'AAMkAGUzYAgI1sa1do_AAEYAAAAAlNFb2CNPe0ucP9you',
        'subject': 'Review strategy for Q3',
        'bodyPreview': '',
        'seriesMasterId': 'AAMkAGUzYRgWAAA=',
        'type': 'occurrence',
        'recurrence': null,
        'start': {
          'dateTime': '2019-04-22T20:30:00.0000000',
          'timeZone': 'UTC'
        },
        'end': {
          'dateTime': '2019-04-22T21:00:00.0000000',
          'timeZone': 'UTC'
        }
      },
      {
        '@odata.etag': 'Wx3IAvB5fbUWf4XNcBFLNUwAAKuA3yQ==',
        'id': 'AAMkAGUzYAgI1sw1n3PAAEYAAAAAlNFb2CNPe0ucP9you',
        'subject': 'Review strategy for Q3',
        'bodyPreview': '',
        'seriesMasterId': 'AAMkAGUzYRgWAAA=',
        'type': 'occurrence',
        'recurrence': null,
        'start': {
          'dateTime': '2019-04-29T20:30:00.0000000',
          'timeZone': 'UTC'
        },
        'end': {
          'dateTime': '2019-04-29T21:00:00.0000000',
          'timeZone': 'UTC'
        }
      }
    ]
  }
}

MGraph.prototype.updateEvent = async function (calendarId, eventId, event) {
  return {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users(919717da-0460-4cca-a6be-d25382429896)/events/$entity',
    '@odata.etag': 'W+T8RDneHMkKe2BGYEaQZ4wAA5a9Acw==',
    'id': 'AAMkADQwMD',
    'createdDateTime': '2017-10-07T04:59:12.9698856Z',
    'lastModifiedDateTime': '2017-10-07T04:59:13.8136423Z',
    'changeKey': '+T8RDneHMkKe2BGYEaQZ4wAA5a9Acw==',
    'categories': [],
    'originalStartTimeZone': 'Pacific Standard Time',
    'originalEndTimeZone': 'Pacific Standard Time',
    'iCalUId': '040000008200E00074C5B7101A82E0080000000028CEBE04293FD3010000000000000000100000009F85AB8AF8ED4D4FAC777FA89954BDB7',
    'reminderMinutesBeforeStart': 15,
    'isReminderOn': true,
    'hasAttachments': false,
    'subject': 'Lets go for lunch',
    'bodyPreview': 'Does late morning work for you?',
    'importance': 'normal',
    'sensitivity': 'normal',
    'isAllDay': false,
    'isCancelled': false,
    'isOrganizer': true,
    'responseRequested': true,
    'seriesMasterId': null,
    'showAs': 'busy',
    'type': 'seriesMaster',
    'webLink': 'https://outlook.office365.com/owa/?itemid=AAMkADQwMD&exvsurl=1&path=/calendar/item',
    'onlineMeetingUrl': null,
    'responseStatus': {
      'response': 'organizer',
      'time': '0001-01-01T00:00:00Z'
    },
    'body': {
      'contentType': 'html',
      'content': '<html>\r\n<head>\r\n<meta http-equiv=\'Content-Type\' content=\'text/html; charset=utf-8\'>\r\n<meta content=\'text/html; charset=us-ascii\'>\r\n</head>\r\n<body>\r\nDoes late morning work for you?\r\n</body>\r\n</html>\r\n'
    },
    'start': {
      'dateTime': '2017-09-04T12:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'end': {
      'dateTime': '2017-09-04T14:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'location': {
      'displayName': 'Harrys Bar',
      'locationType': 'default',
      'uniqueId': 'Harrys Bar',
      'uniqueIdType': 'private'
    },
    'locations': [
      {
        'displayName': 'Harrys Bar',
        'locationType': 'default',
        'uniqueIdType': 'unknown'
      }
    ],
    'recurrence': {
      'pattern': {
        'type': 'weekly',
        'interval': 1,
        'month': 0,
        ' dayOfMonth': 0,
        'daysOfWeek': [
          'monday'
        ],
        'firstDayOfWeek': 'sunday',
        'index': 'first'
      },
      'range': {
        'type': 'endDate',
        'startDate': '2017-09-04',
        'endDate': '2017-12-31',
        'recurrenceTimeZone': 'Pacific Standard Time',
        'numberOfOccurrences': 0
      }
    },
    'attendees': [
      {
        'type': 'required',
        'status': {
          'response': 'none',
          'time': '0001-01-01T00:00:00Z'
        },
        'emailAddress': {
          'name': 'Adele Vance',
          'address': 'AdeleV@contoso.onmicrosoft.com'
        }
      }
    ],
    'organizer': {
      'emailAddress': {
        'name': 'Alex Wilber',
        'address': 'AlexW@contoso.onmicrosoft.com'
      }
    },
    'OnlineMeeting': null
  }
}

MGraph.prototype.deleteEvent = async function (calendarId, eventId) {
  return true
}


module.exports.setupClient = async function(credential) {
  return new MGraph()
}
