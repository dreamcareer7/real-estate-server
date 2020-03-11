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

async function bulkUpsert() {
  const records = []

  records.push(generateCalendarEventRecord(googleCalendar, events.remote_event_1))

  const result = await GoogleCalendarEvent.bulkUpsert(records)

  expect(result.length).to.be.equal(records.length)
  expect(result[0].google_credential).to.be.equal(googleCredential.id)
  expect(result[0].google_calendar).to.be.equal(googleCalendar.id)
  expect(result[0].event_id).to.be.equal(events.remote_event_1.id)
}

async function deleteLocalByRemoteIds() {
  const event = await createLocal()
  const cal   = await GoogleCalendar.get(event.google_calendar)
  await GoogleCalendarEvent.deleteLocalByRemoteIds(cal, [event.event_id])
  const updated = await GoogleCalendarEvent.get(event.id)

  expect(updated.status).to.be.equal('canceled')
  expect(updated.deleted_at).to.be.not.equal(null)
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


describe('Google', () => {
  describe('Google Calendars Events', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar event', createLocal)
    it('should upsert a batch of google calendar events', bulkUpsert)
    it('should delete some google calendars by remote ids', deleteLocalByRemoteIds)
    it('should delete some google remote by calendar id', deleteLocalByCalendar)
    it('should returns an array of google calendar events', getAll)
    it('should handle get event', getFailed)
    it('should returns an array of google calendar events - by calendar and event ids', getByCalendarAndEventRemoteIds)
    it('should returns an array of google calendar event ids - by calendar id', getByCalendarIds)
  })
})