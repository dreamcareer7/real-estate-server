const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleCalendar   = require('../../../lib/models/Google/calendar')

const { createGoogleMessages, createGoogleCalendar } = require('./helper')
const calendars = require('./data/calendars.json')

let user, brand, googleCredential



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createGoogleMessages(user, brand)
  googleCredential = credential

  Context.set({ user, brand, googleCredential })
}

async function createLocal() {
  return await createGoogleCalendar(googleCredential)
}

async function persistRemoteCalendar() {
  const id  = await GoogleCalendar.persistRemoteCalendar(googleCredential.id, calendars.remote_cal_1)
  const cal = await GoogleCalendar.get(id)

  expect(cal.id).to.be.equal(id)
  expect(cal.calendar_id).to.be.equal(calendars.remote_cal_1.id)
  expect(cal.type).to.be.equal('google_calendars')
  expect(cal.google_credential).to.be.equal(googleCredential.id)
  expect(cal.summary).to.be.equal(calendars.remote_cal_1.summary)
  expect(cal.location).to.be.equal(calendars.remote_cal_1.location)
  expect(cal.timeZone).to.be.equal(calendars.remote_cal_1.time_zone)
  expect(cal.description).to.be.equal(calendars.remote_cal_1.description)
  expect(cal.origin).to.be.equal(calendars.remote_cal_1.origin)
  expect(cal.selected).to.be.equal(false)
  expect(cal.deleted).to.be.equal(false)
  expect(cal.primary).to.be.equal(false)
  expect(cal.sync_token).to.be.equal(null)
  expect(cal.watcher).to.be.equal(null)
  expect(cal.watcher_status).to.be.equal(null)
  expect(cal.watcher_channel_id).to.be.equal(null)
  expect(cal.deleted_at).to.be.equal(null)
  expect(cal.access_role).to.be.equal('owner')

  return cal
}

async function getByRemoteCalendarIdFiled() {
  const cal = await GoogleCalendar.getByRemoteCalendarId(googleCredential.id, 'xxxx')
  expect(cal).to.be.equal(null)
}

async function getByRemoteCalendarId() {
  const cal = await createLocal()
  const alt = await GoogleCalendar.getByRemoteCalendarId(googleCredential.id, cal.calendar_id)

  expect(cal.id).to.be.equal(alt.id)
  expect(cal.calendar_id).to.be.equal(alt.calendar_id)
}

async function deleteLocalByRemoteCalendarId() {
  const cal = await createLocal()
  
  await GoogleCalendar.deleteLocalByRemoteCalendarId(cal)

  const updated = await GoogleCalendar.get(cal.id)

  expect(updated.id).to.be.equal(cal.id)
  expect(updated.deleted_at).to.be.not.equal(null)
  expect(updated.deleted).to.be.not.equal(true)
}

async function getFailed() {
  try {
    await GoogleCalendar.get(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google calendar by id ${googleCredential.id} not found.`)
  }
}

async function getAllByGoogleCredential() {
  await createLocal()
  const calendars = await GoogleCalendar.getAllByGoogleCredential(googleCredential.id)

  expect(calendars.length).to.be.equal(1)
  expect(calendars[0].type).to.be.equal('google_calendars')
}

async function updateSyncToken() {
  const syncToken = 'xxxxxx'

  const cal     = await createLocal()
  const id      = await GoogleCalendar.updateSyncToken(cal.id, syncToken)
  const updated = await GoogleCalendar.get(id)

  expect(updated.id).to.be.equal(cal.id)
  expect(updated.sync_token).to.be.equal(syncToken)
}

async function updateWatcher() {
  const wId     = uuid.v4()
  const wStatus = 'status'
  const wResult = 'status'

  const cal = await createLocal()
  await GoogleCalendar.updateWatcher(cal.id, wId, wStatus, wResult)
  const updated = await GoogleCalendar.get(cal.id)

  expect(updated.watcher_channel_id).to.be.equal(wId)
  expect(updated.watcher_status).to.be.equal(wStatus)
  expect(updated.watcher).to.be.equal(wResult)
}

async function listRemoteCalendars() {
  const result = await GoogleCalendar.listRemoteCalendars(googleCredential.id)

  expect(result.length).to.be.not.equal(0)
  expect(result[0].kind).to.be.equal('calendar#calendarListEntry')

  return result
}

async function persistRemoteCalendarsSimple() {
  const result = await GoogleCalendar.persistRemoteCalendars(googleCredential, [])

  expect(result.activeCalendarIds.length).to.be.equal(0)
}

async function persistRemoteCalendars() {
  const remoteCals = await listRemoteCalendars()
  const toSyncRemoteCalendarIds  = remoteCals.map(cal => cal.id)
  const result      = await GoogleCalendar.persistRemoteCalendars(googleCredential, toSyncRemoteCalendarIds)
  const pesistedCal = await GoogleCalendar.get(result.activeCalendarIds[0])

  expect(result.activeCalendarIds.length).to.be.equal(toSyncRemoteCalendarIds.length)
  expect(pesistedCal.id).to.be.equal(result.activeCalendarIds[0])
  expect(pesistedCal.google_credential).to.be.equal(googleCredential.id)
  expect(pesistedCal.origin).to.be.equal('google')
  expect(pesistedCal.type).to.be.equal('google_calendars')
}

async function create() {
  const body = {
    summary: 'summary',
    description: 'description',
    location: 'location',
    timeZone: 'Europe/Zurich'
  }

  const id = await GoogleCalendar.create(googleCredential.id, body)
  const calendar = await GoogleCalendar.get(id)

  expect(calendar.google_credential).to.be.equal(googleCredential.id)
  expect(calendar.type).to.be.equal('google_calendars')
  expect(calendar.summary).to.be.equal(body.summary)
}

async function getRemoteGoogleCalendars() {
  const result = await GoogleCalendar.getRemoteGoogleCalendars(googleCredential)

  expect(result.calendars.length).to.be.equal(5)
  expect(result.currentSelectedCal).to.be.equal(null)

  return result
}

async function configureCalendars() {
  const data = await getRemoteGoogleCalendars()

  const conf = {
    toSync: [data.calendars[0].id, data.calendars[1].id],
    toStopSync: []
  }

  expect(googleCredential.google_calendar).to.be.equal(null)

  await GoogleCalendar.configureCalendars(googleCredential, conf)

  const updatedGoogleCredential = await GoogleCredential.get(googleCredential.id)
  
  expect(updatedGoogleCredential.google_calendar).to.be.not.equal(null)

  const rechatCalendar = await GoogleCalendar.get(updatedGoogleCredential.google_calendar)

  expect(rechatCalendar.google_credential).to.be.equal(googleCredential.id)

  return rechatCalendar
}

async function configureCalendarsFails() {
  const conf = {
    'toStopSync': ['x', 'y', 'z'],
    'toSync': ['x', 'm', 'k']
  }

  try {
    await GoogleCalendar.configureCalendars(googleCredential, conf)
  } catch (ex) {
    expect(ex.message).to.be.equal('Google calendar by id x not found.')
  }
}


describe('Google', () => {
  describe('Google Calendars', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar', createLocal)
    it('should persist a remote google calendar into disk', persistRemoteCalendar)
    it('should fail in get by remote calendar id', getByRemoteCalendarIdFiled)
    it('should return a calendar by remote calendar id', getByRemoteCalendarId)
    it('should delete a local calendar by remote calendar id', deleteLocalByRemoteCalendarId)
    it('should fail in get by id', getFailed)
    it('should return calendars by channel credential id', getAllByGoogleCredential)
    it('should update a calendar\'s sync_token', updateSyncToken)
    it('should update watcher status', updateWatcher)
    
    it('should return a list of remote google calendars', listRemoteCalendars)
    it('should persist remote google calendars without any ToSync calendars', persistRemoteCalendarsSimple)
    it('should persist remote google calendars', persistRemoteCalendars)
    it('should create a remote google calendars', create)
    it('should return an object of remote google calendars', getRemoteGoogleCalendars)
    it('should config google calendars', configureCalendars)
    it('should handle bad configs', configureCalendarsFails)
  })
})