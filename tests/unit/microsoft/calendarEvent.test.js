const { expect } = require('chai')
const { createContext } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User/get')
const BrandHelper = require('../brand/helper')
const MicrosoftCalendar      = require('../../../lib/models/Microsoft/calendar')
const MicrosoftCalendarEvent = require('../../../lib/models/Microsoft/calendar_events')

const { generateCalendarEvent } = require('../../../lib/models/Microsoft/workers/subscriptions/calendar/common')

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

async function bulkDelete() {
  const records = []
  records.push(generateCalendarEvent(microsoftCalendar, events.remote_event_1))
  const result = await MicrosoftCalendarEvent.bulkUpsert(records)

  const ids = result.map(e => e.id)
  const created = await MicrosoftCalendarEvent.getAll(ids)

  for (const rec of created) {
    expect(rec.deleted_at).to.be.equal(null)
  }

  const toBeDeleted = result.map(e => ({
    microsoft_credential: e.microsoft_credential,
    microsoft_calendar: e.microsoft_calendar,
    event_id: e.event_id
  }))
  await MicrosoftCalendarEvent.bulkDelete(toBeDeleted)

  const deletedIds = result.map(e => e.id)
  const deleted = await MicrosoftCalendarEvent.getAll(deletedIds)

  for (const rec of deleted) {
    expect(rec.deleted_at).to.be.not.equal(null)
  }
}

async function getAll() {
  const event = await createLocal()

  const ids = [event.id]
  const events = await MicrosoftCalendarEvent.getAll(ids)

  expect(events.length).to.be.equal(ids.length)
}

async function get() {
  const created = await createLocal()
  const cal = await MicrosoftCalendarEvent.get(created.id)

  expect(created.id).to.be.equal(cal.id)
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

async function deleteMany() {
  const event  = await createLocal()
  await MicrosoftCalendarEvent.deleteMany([event.id])

  expect(event.deleted_at).to.be.equal(null)

  const deleted = await MicrosoftCalendarEvent.get(event.id)

  expect(deleted.id).to.be.equal(event.id)
  expect(deleted.deleted_at).to.not.be.equal(null)
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

async function getMCredentialEventsNum() {
  const event = await createLocal()
  const cal   = await MicrosoftCalendar.get(event.microsoft_calendar)
  const res   = await MicrosoftCalendarEvent.getMCredentialEventsNum(cal.microsoft_credential)

  expect(res[0].count).to.be.equal(1)
}


describe('Microsoft', () => {
  describe('Microsoft Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft calendar event', createLocal)
    it('should upsert a batch of microsoft calendar events', bulkUpsert)
    it('should delete a batch of microsoft calendar events', bulkDelete)
    it('should returns an array of microsoft calendar events', getAll)
    it('should return a calendar event by id', get)
    it('should handle get event', getFailed)
    it('should returns an array of microsoft calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of microsoft calendar event ids - by calendar id', getByCalendarIds)
    it('should delete events', deleteMany)
    it('should delete events by remote_ids', deleteLocalByRemoteIds)
    it('should delete some microsoft calendars by remote ids', deleteLocalByRemoteIds)
    it('should delete some microsoft remote by calendar id', deleteLocalByCalendar)
    it('should return number of events', getMCredentialEventsNum)
  })
})
