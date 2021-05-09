const uuid = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User/get')
const BrandHelper = require('../brand/helper')
const GoogleCalendar      = require('../../../lib/models/Google/calendar')
const GoogleCalendarEvent = require('../../../lib/models/Google/calendar_events')

const { generateCalendarEvent } = require('../../../lib/models/Google/workers/calendars/common.js')

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

async function bulkUpsert() {
  const records = []

  records.push(generateCalendarEvent(googleCalendar, events.remote_event_1))

  const result = await GoogleCalendarEvent.bulkUpsert(records)

  expect(result.length).to.be.equal(records.length)
  expect(result[0].google_credential).to.be.equal(googleCredential.id)
  expect(result[0].google_calendar).to.be.equal(googleCalendar.id)
  expect(result[0].event_id).to.be.equal(events.remote_event_1.id)
}

async function bulkDelete() {
  const records = []
  records.push(generateCalendarEvent(googleCalendar, events.remote_event_1))
  const result = await GoogleCalendarEvent.bulkUpsert(records)

  const ids = result.map(e => e.id)
  const created = await GoogleCalendarEvent.getAll(ids)

  for (const rec of created) {
    expect(rec.deleted_at).to.be.equal(null)
  }

  const toBeDeleted = result.map(e => ({
    google_credential: e.google_credential,
    google_calendar: e.google_calendar,
    event_id: e.event_id
  }))
  await GoogleCalendarEvent.bulkDelete(toBeDeleted)

  const deletedIds = result.map(e => e.id)
  const deleted = await GoogleCalendarEvent.getAll(deletedIds)

  for (const rec of deleted) {
    expect(rec.deleted_at).to.be.not.equal(null)
  }
}

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
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

async function get() {
  const created = await createLocal()
  const cal = await GoogleCalendarEvent.get(created.id)

  expect(created.id).to.be.equal(cal.id)
}

async function getFailed() {
  try {
    await GoogleCalendarEvent.get(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google calendar event by ${googleCredential.id} not found.`)
  }
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

async function getMovedEvents() {
  const other_google_calendar = uuid.v4()

  const event   = await createLocal()
  const cal     = await GoogleCalendar.get(event.google_calendar)
  const resuult = await GoogleCalendarEvent.getMovedEvents(cal.google_credential, other_google_calendar, [event.event_id])

  expect(resuult[0]).to.be.equal(event.id)
}

async function updateCalendar() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)

  await GoogleCalendarEvent.updateCalendar([event.id], cal.id)
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.id).to.be.equal(event.id)
}

async function deleteMany() {
  const event  = await createLocal()
  await GoogleCalendarEvent.deleteMany([event.id])

  expect(event.deleted_at).to.be.equal(null)

  const deleted = await GoogleCalendarEvent.get(event.id)

  expect(deleted.id).to.be.equal(event.id)
  expect(deleted.deleted_at).to.not.be.equal(null)
}

async function deleteLocalByCalendar() {
  const event  = await createLocal()
  const cal     = await GoogleCalendar.get(event.google_calendar)

  await GoogleCalendarEvent.deleteLocalByCalendar(cal)

  expect(event.deleted_at).to.be.equal(null)

  const deleted = await GoogleCalendarEvent.get(event.id)

  expect(deleted.id).to.be.equal(event.id)
  expect(deleted.deleted_at).to.not.be.equal(null)
}

async function getGCredentialEventsNum() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  const res   = await GoogleCalendarEvent.getGCredentialEventsNum(cal.google_credential)

  expect(res[0].count).to.be.equal(1)
}


describe('Google', () => {
  describe('Google Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar event', createLocal)
    it('should upsert a batch of google calendar events', bulkUpsert)
    it('should delete a batch of google calendar events', bulkDelete)
    it('should delete some google remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of google calendar events', getAll)
    it('should handle get', get)
    it('should handle get failure', getFailed)
    it('should returns an array of google calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of google calendar event ids - by calendar id', getByCalendarIds)
    it('should returns moved events', getMovedEvents)
    it('should update even\'s calendar', updateCalendar)
    it('should delete events', deleteMany)
    it('should delete events by remote_ids', deleteLocalByRemoteIds)
    it('should return number of events', getGCredentialEventsNum)
  })
})