const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const MicrosoftCalendar      = require('../../../lib/models/Microsoft/calendar')
const MicrosoftCalendarEvent = require('../../../lib/models/Microsoft/calendar_events')

const { generateCalendarEvent } = require('../../../lib/models/Microsoft/workers/subscriptions/common')

const { createMicrosoftMessages, createMicrosoftCalendar, createMicrosoftCalendarEvent } = require('./helper')
const events = require('./data/calendar_events.json')

let user, brand, microsoftCredential, microsoftCalendar



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createMicrosoftMessages(user, brand)
  microsoftCredential = credential

  microsoftCalendar = await createMicrosoftCalendar(microsoftCredential)

  Context.set({ user, brand, microsoftCredential, microsoftCalendar })
}

async function createLocal() {
  return await createMicrosoftCalendarEvent(microsoftCredential)
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

  const record = generateCalendarEvent(microsoftCalendar, events.remote_event_1)

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

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  await MicrosoftCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
  const updated = await MicrosoftCalendarEvent.get(event.id)

  expect(updated.deleted_at).to.be.not.equal(null)
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
    it('should delete some microsoft calendars by remote ids', deleteLocalByRemoteIds)
    it('should delete some microsoft remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of microsoft calendar events', getAll)
    it('should handle get event', getFailed)
    it('should returns an array of microsoft calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of microsoft calendar event ids - by calendar id', getByCalendarIds)

    it('should create a remote microsoft calendar event', create)
    it('should update a remote microsoft calendar event', update)
    it('should delete a remote microsoft calendar event', deleteEvent)
  })
})