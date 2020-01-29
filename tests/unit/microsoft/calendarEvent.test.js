const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const MicrosoftCalendar      = require('../../../lib/models/Microsoft/calendar')
const MicrosoftCalendarEvent = require('../../../lib/models/Microsoft/calendar_events')

const { generateCalendarEventRecord } = require('../../../lib/models/Microsoft/workers/subscriptions/common')


const { createMicrosoftMessages } = require('./helper')

let user, brand, microsoftCredential, microsoftCalendar

const calendars = {
  remote_cal_1: {
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

const events = {
  remote_event_1: {
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


async function createCal() {
  const id  = await MicrosoftCalendar.createLocal(microsoftCredential.id, calendars.remote_cal_1)
  const cal = await MicrosoftCalendar.get(id)

  expect(cal.id).to.be.equal(id)
  expect(cal.calendar_id).to.be.equal(calendars.remote_cal_1.id)
  expect(cal.type).to.be.equal('microsoft_calendars')
  expect(cal.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(cal.name).to.be.equal(calendars.remote_cal_1.name)
  expect(cal.to_sync).to.be.equal(false)

  return cal
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createMicrosoftMessages(user, brand)
  microsoftCredential = credential

  microsoftCalendar = await createCal()

  Context.set({ user, brand, microsoftCredential, microsoftCalendar })
}

async function createLocal() {
  const id    = await MicrosoftCalendarEvent.createLocal(microsoftCalendar, events.remote_event_1)
  const event = await MicrosoftCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.microsoft_calendar).to.be.equal(microsoftCalendar.id)
  expect(event.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(event.event_id).to.be.equal(events.remote_event_1.id)
  expect(event.subject).to.be.equal(events.remote_event_1.subject)
  expect(event.type).to.be.equal('microsoft_calendar_events')
  expect(event.description).to.be.equal(events.remote_event_1.description)
  expect(event.event_start).to.deep.equal(events.remote_event_1.start)
  expect(event.event_end).to.deep.equal(events.remote_event_1.end)

  return event
}

async function updateLocal() {
  const event   = await createLocal()
  const ids     = await MicrosoftCalendarEvent.updateLocal(event.id, event)
  const updated = await MicrosoftCalendarEvent.get(ids[0])

  expect(event.id).to.be.equal(updated.id)
  expect(event.microsoft_calendar).to.be.equal(updated.microsoft_calendar)
  expect(event.microsoft_credential).to.be.equal(updated.microsoft_credential)
  expect(event.event_id).to.be.equal(updated.event_id)
  expect(event.subject).to.be.equal(updated.subject)
  expect(event.location).to.be.deep.equal(updated.location)
  expect(event.description).to.be.equal(updated.description)
  expect(event.event_start).to.deep.equal(updated.event_start)
  expect(event.event_end).to.deep.equal(updated.event_end)
}

async function bulkUpsert() {
  const records = []

  const record = generateCalendarEventRecord(microsoftCalendar, events.remote_event_1)

  if (record)
    records.push()

  const result = await MicrosoftCalendarEvent.bulkUpsert(records)

  expect(result.length).to.be.equal(records.length)

  if (result.length) {
    expect(result[0].microsoft_credential).to.be.equal(microsoftCredential.id)
    expect(result[0].microsoft_calendar).to.be.equal(microsoftCalendar.id)
    expect(result[0].event_id).to.be.equal(events.remote_event_1.id)
  }
}

async function deleteLocal() {
  const event = await createLocal()
  await MicrosoftCalendarEvent.deleteLocal(event.id)
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.deleted_at).to.be.not.equal(null)
}

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  await MicrosoftCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.deleted_at).to.be.not.equal(null)
}

async function restoreLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  await MicrosoftCalendarEvent.restoreLocalByRemoteIds(cal, [event.event_id])
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.deleted_at).to.be.equal(null)
}

async function deleteLocalByCalendar() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  await MicrosoftCalendarEvent.deleteLocalByCalendar(cal)
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.deleted_at).to.be.not.equal(null)
}

async function getAll() {
  const event = await createLocal()

  const ids = [event.id]
  const events = await MicrosoftCalendarEvent.getAll(ids)

  expect(events.length).to.be.equal(ids.length)
}

async function getFailed() {
  try {
    await MicrosoftCalendarEvent.get(microsoftCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Microsoft calendar event by ${microsoftCredential.id} not found.`)
  }
}

async function getByCalendar() {
  const event  = await createLocal()
  const cal    = await MicrosoftCalendar.get(event.microsoft_calendar)
  const events = await MicrosoftCalendarEvent.getByCalendar(cal)

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].microsoft_credential).to.be.equal(event.microsoft_credential)
  expect(events[0].microsoft_calendar).to.be.equal(event.microsoft_calendar)
}

async function getByCalendarAndEventRemoteIds() {
  const event  = await createLocal()
  const cal    = await MicrosoftCalendar.get(event.microsoft_calendar)
  const events = await MicrosoftCalendarEvent.getByCalendarAndEventRemoteIds(cal, [event.event_id])

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].microsoft_credential).to.be.equal(event.microsoft_credential)
  expect(events[0].microsoft_calendar).to.be.equal(event.microsoft_calendar)
}

async function getByCalendarIds() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  const ids   = await MicrosoftCalendarEvent.getByCalendarIds(cal.microsoft_credential, [cal.id])

  expect(ids.length).to.not.be.equal(0)
  expect(ids[0]).to.be.equal(event.id)
}

async function create() {
  const body = {
    'name': 'Lets go for lunch',
    'location': '800 Howard St., San Francisco, CA 94103',
    'description': 'A chance to hear more about Microsoft\'s developer products.',
    'start': {
      'dateTime': '2017-09-04T12:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'end': {
      'dateTime': '2017-09-04T14:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
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
    ]
  }
  
  const id = await MicrosoftCalendarEvent.create(microsoftCalendar, body)
  const event = await MicrosoftCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.microsoft_credential).to.be.equal(microsoftCalendar.microsoft_credential)
  expect(event.microsoft_calendar).to.be.equal(microsoftCalendar.id)
  expect(event.subject).to.be.equal(body.name)
  expect(event.event_start).to.be.deep.equal(body.start)
  expect(event.event_end).to.be.deep.equal(body.end)
  expect(event.attendees).to.be.deep.equal(body.attendees)

  return event
}

async function update() {
  const event = await create()

  const body = {
    'name': 'Lets go for lunch',
    'location': '800 Howard St., San Francisco, CA 94103',
    'description': 'A chance to hear more about Microsoft\'s developer products.',
    'start': {
      'dateTime': '2017-09-04T12:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
    },
    'end': {
      'dateTime': '2017-09-04T14:00:00.0000000',
      'timeZone': 'Pacific Standard Time'
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
    ]
  }
  
  await MicrosoftCalendarEvent.update(event.id, microsoftCalendar, body)
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.microsoft_credential).to.be.equal(microsoftCalendar.microsoft_credential)
  expect(updated.microsoft_calendar).to.be.equal(microsoftCalendar.id)
  expect(updated.subject).to.be.equal(body.name)
  expect(updated.event_start).to.be.deep.equal(body.start)
  expect(updated.event_end).to.be.deep.equal(body.end)
  expect(updated.attendees).to.be.deep.equal(body.attendees)
}

async function deleteEvent() {
  const event = await create()
  
  await MicrosoftCalendarEvent.delete(event.id, microsoftCalendar)
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.microsoft_credential).to.be.equal(microsoftCalendar.microsoft_credential)
  expect(updated.microsoft_calendar).to.be.equal(microsoftCalendar.id)
  expect(updated.deleted_at).to.be.not.equal(null)
}


describe('Microsoft', () => {
  describe('Microsoft Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft calendar event', createLocal)
    it('should update a microsoft calendar event', updateLocal)
    it('should upsert a batch of microsoft calendar events', bulkUpsert)
    it('should delete a microsoft calendar event', deleteLocal)
    it('should delete some microsoft calendars by remote ids', deleteLocalByRemoteIds)
    it('should restore some microsoft calendars by remote ids', restoreLocalByRemoteIds)
    it('should delete some microsoft remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of microsoft calendar events', getAll)
    it('should handle get event', getFailed)
    it('should returns an array of microsoft calendar events - by calendar id', getByCalendar)
    it('should returns an array of microsoft calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of microsoft calendar event ids - by calendar id', getByCalendarIds)

    it('should create a remote microsoft calendar event', create)
    it('should update a remote microsoft calendar event', update)
    it('should delete a remote microsoft calendar event', deleteEvent)
  })
})