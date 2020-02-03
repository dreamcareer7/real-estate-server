const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')
const GoogleCalendar      = require('../../../lib/models/Google/calendar')
const GoogleCalendarEvent = require('../../../lib/models/Google/calendar_events')

const { generateCalendarEventRecord } = require('../../../lib/models/Google/workers/calendars/common.js')

const { createGoogleMessages, createGoogleCalendar, createGoogleCalendarEvent } = require('./helper')
const events = require('./data/calendar_events.json')

let user, brand, googleCredential, googleCalendar



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createGoogleMessages(user, brand)
  googleCredential = credential

  googleCalendar = await createGoogleCalendar(googleCredential)

  Context.set({ user, brand, googleCredential, googleCalendar })
}

async function createLocal() {
  return await createGoogleCalendarEvent(googleCredential)
}

async function updateLocal() {
  const event   = await createLocal()
  const ids     = await GoogleCalendarEvent.updateLocal(event.id, event)
  const updated = await GoogleCalendarEvent.get(ids[0])

  expect(event.id).to.be.equal(updated.id)
  expect(event.google_calendar).to.be.equal(updated.google_calendar)
  expect(event.google_credential).to.be.equal(updated.google_credential)
  expect(event.event_id).to.be.equal(updated.event_id)
  expect(event.summary).to.be.equal(updated.summary)
  expect(event.location).to.be.equal(updated.location)
  expect(event.timeZone).to.be.equal(updated.timeZone)
  expect(event.description).to.be.equal(updated.description)
  expect(event.origin).to.be.equal(updated.origin)
  expect(event.status).to.be.equal(updated.status)
  expect(event.recurring_event_id).to.be.equal(updated.recurring_event_id)
  expect(event.organizer).to.deep.equal(updated.organizer)
  expect(event.event_start).to.deep.equal(updated.event_start)
  expect(event.event_end).to.deep.equal(updated.event_end)
}

async function bulkUpsert() {
  const records = []

  records.push(generateCalendarEventRecord(googleCalendar, events.remote_event_1))

  const result = await GoogleCalendarEvent.bulkUpsert(records)

  expect(result.length).to.be.equal(records.length)
  expect(result[0].google_credential).to.be.equal(googleCredential.id)
  expect(result[0].google_calendar).to.be.equal(googleCalendar.id)
  expect(result[0].event_id).to.be.equal(events.remote_event_1.id)
}

async function deleteLocal() {
  const event = await createLocal()
  await GoogleCalendarEvent.deleteLocal(event.id)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function restoreLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.restoreLocalByRemoteIds(cal, [event.event_id])
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('confirmed')
  expect(updated.deleted_at).to.be.equal(null)
}

async function deleteLocalByCalendar() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByCalendar(cal)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}

async function getAll() {
  const event = await createLocal()

  const ids = [event.id]
  const events = await GoogleCalendarEvent.getAll(ids)

  expect(events.length).to.be.equal(ids.length)
}

async function getFailed() {
  try {
    await GoogleCalendarEvent.get(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google calendar event by ${googleCredential.id} not found.`)
  }
}

async function getByCalendar() {
  const event  = await createLocal()
  const cal    = await GoogleCalendar.get(event.google_calendar)
  const events = await GoogleCalendarEvent.getByCalendar(cal)

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].google_credential).to.be.equal(event.google_credential)
  expect(events[0].google_calendar).to.be.equal(event.google_calendar)
}

async function getByCalendarAndEventRemoteIds() {
  const event  = await createLocal()
  const cal    = await GoogleCalendar.get(event.google_calendar)
  const events = await GoogleCalendarEvent.getByCalendarAndEventRemoteIds(cal, [event.event_id])

  expect(events.length).to.be.equal(1)
  expect(events[0].id).to.be.equal(event.id)
  expect(events[0].google_credential).to.be.equal(event.google_credential)
  expect(events[0].google_calendar).to.be.equal(event.google_calendar)
}

async function getByCalendarIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  const ids   = await GoogleCalendarEvent.getByCalendarIds(cal.google_credential, [cal.id])

  expect(ids.length).to.not.be.equal(0)
  expect(ids[0]).to.be.equal(event.id)
}

async function create() {
  const body = {
    'summary': 'Google I/O 2015',
    'location': '800 Howard St., San Francisco, CA 94103',
    'description': 'A chance to hear more about Google\'s developer products.',
    'start': {
      'dateTime': '2015-05-28T09:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'end': {
      'dateTime': '2015-05-28T17:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'attendees': [
      {'email': 'lpage@example.com'},
      {'email': 'sbrin@example.com'}
    ],
    'reminders': {
      'useDefault': false
    }
  }
  
  const id = await GoogleCalendarEvent.create(googleCalendar, body)
  const event = await GoogleCalendarEvent.get(id)

  expect(event.id).to.be.equal(id)
  expect(event.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(event.google_calendar).to.be.equal(googleCalendar.id)
  expect(event.summary).to.be.equal(body.summary)
  expect(event.event_start).to.be.deep.equal(body.start)
  expect(event.event_end).to.be.deep.equal(body.end)
  expect(event.reminders).to.be.deep.equal(body.reminders)

  return event
}

async function update() {
  const event = await create()

  const body = {
    'summary': 'Google I/O 2015 - xxxx',
    'location': '800 Howard St., San Francisco, CA 94103 - xxxx',
    'description': 'A chance to hear more about Google\'s developer products - xxxx',
    'start': {
      'dateTime': '2016-05-28T09:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'end': {
      'dateTime': '2016-05-28T17:00:00-07:00',
      'timeZone': 'America/Los_Angeles'
    },
    'attendees': [
      {'email': 'lpagexxx@example.com'},
      {'email': 'sbrinxxx@example.com'}
    ],
    'reminders': {
      'useDefault': false
    }
  }
  
  await GoogleCalendarEvent.update(event.id, googleCalendar, body)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(updated.google_calendar).to.be.equal(googleCalendar.id)
  expect(updated.summary).to.be.equal(body.summary)
  expect(updated.event_start).to.be.deep.equal(body.start)
  expect(updated.event_end).to.be.deep.equal(body.end)
  expect(updated.reminders).to.be.deep.equal(body.reminders)
}

async function deleteEvent() {
  const event = await create()
  
  await GoogleCalendarEvent.delete(event.id, googleCalendar)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.google_credential).to.be.equal(googleCalendar.google_credential)
  expect(updated.google_calendar).to.be.equal(googleCalendar.id)
  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
}


describe('Google', () => {
  describe('Google Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar event', createLocal)
    it('should update a google calendar event', updateLocal)
    it('should upsert a batch of google calendar events', bulkUpsert)
    it('should delete a google calendar event', deleteLocal)
    it('should delete some google calendars by remote ids', deleteLocalByRemoteIds)
    it('should restore some google calendars by remote ids', restoreLocalByRemoteIds)
    it('should delete some google remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of google calendar events', getAll)
    it('should handle get event', getFailed)
    it('should returns an array of google calendar events - by calendar id', getByCalendar)
    it('should returns an array of google calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of google calendar event ids - by calendar id', getByCalendarIds)

    it('should create a remote google calendar event', create)
    it('should update a remote google calendar event', update)
    it('should delete a remote google calendar event', deleteEvent)
  })
})