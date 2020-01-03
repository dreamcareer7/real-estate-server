const { expect } = require('chai')
const { createContext } = require('../helper')

const Context        = require('../../../lib/models/Context')
const User           = require('../../../lib/models/User')
const BrandHelper    = require('../brand/helper')
const GoogleCalendar = require('../../../lib/models/Google/calendar')

const { createGoogleMessages } = require('./helper')

let user, brand, googleCredential

const calendars = {
  remote_cal_1: {
    id: 'remote_cal_id_1',
    summary: 'summary_1',
    summaryOverride: 'summaryOverride_1',
    description: 'description_1',
    location: 'location',
    timeZone: 'timeZone',
    conferenceProperties: 'conferenceProperties',
    origin: 'google',
    accessRole: 'owner',
    selected: false,
    deleted: false,
    primary: false,
    defaultReminders: {},
    notificationSettings: {},
    conference_properties: {}
  }
}

/*
const configs = {
  conf_1: {
    rechatCalendar: {
      type: 'new',
      body: calendars.remote_cal_1
    },
    toSync: ['x', 'y', 'z']
  },

  conf_2: {
    rechatCalendar: {
      type: 'old',
      id: 'my_custom_cal',
    },
    toSync: ['x', 'y', 'z']
  },

  conf_3: {
    toSync: ['heshmat.zapata@gmail.com'],
    toStopSync: ['saeed.uni68@gmail.com']
  }
}*/


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createGoogleMessages(user, brand)
  googleCredential = credential

  Context.set({ user, brand, googleCredential })
}

async function createLocal() {
  const id  = await GoogleCalendar.createLocal(googleCredential.id, calendars.remote_cal_1)
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

  return cal
}

async function updateLocal() {
  const toUpdate = {
    summary: 'summary_updated',
    description: 'description_updated',
    location: 'location_updated',
    timeZone: 'timeZone_updated'
  }

  const cal = await createLocal()
  const ids = await GoogleCalendar.updateLocal(cal.id, toUpdate)

  const updated = await GoogleCalendar.get(ids[0])

  expect(updated.id).to.be.equal(cal.id)
  expect(updated.calendar_id).to.be.equal(cal.calendar_id)
  expect(updated.summary).to.be.equal(toUpdate.summary)
  expect(updated.description).to.be.equal(toUpdate.description)
  expect(updated.location).to.be.equal(toUpdate.location)
  expect(updated.timeZone).to.be.equal(toUpdate.time_zone)

  return cal
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
  try {
    await GoogleCalendar.getByRemoteCalendarId(googleCredential.id, 'xxxx')
  } catch (err) {
    expect(err.message).to.be.equal('Google calendar by id xxxx not found.')
  }
}

async function getByRemoteCalendarId() {
  const cal = await createLocal()
  const alt = await GoogleCalendar.getByRemoteCalendarId(googleCredential.id, cal.calendar_id)

  expect(cal.id).to.be.equal(alt.id)
  expect(cal.calendar_id).to.be.equal(alt.calendar_id)
}

async function deleteLocalByRemoteCalendarId() {
  const cal = await createLocal()
  
  await GoogleCalendar.deleteLocalByRemoteCalendarId(googleCredential.id, cal.calendar_id)

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

async function getByWatcherChannelId() {
  try {
    await GoogleCalendar.getByWatcherChannelId(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google Calendar by channel ${googleCredential.id} not found.`)
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

async function stopSync() {
  const cal = await createLocal()
  
  const remoteCalendarIds = [cal.calendar_id]

  const ids       = await GoogleCalendar.stopSync(googleCredential.id, remoteCalendarIds)
  const calendars = await GoogleCalendar.getAll(ids)

  expect(calendars.length).to.be.equal(1)
  expect(calendars[0].watcher_status).to.be.equal('stopped')
}

async function listRemoteCalendars() {
  const result = await GoogleCalendar.listRemoteCalendars(googleCredential.id)

  expect(result.length).to.be.not.equal(0)
  expect(result[0].kind).to.be.equal('calendar#calendarListEntry')

  return result
}

async function persistRemoteCalendarsSimple() {
  const result = await GoogleCalendar.persistRemoteCalendars(googleCredential.id, [])

  expect(result.length).to.be.equal(0)
}

async function persistRemoteCalendars() {
  const remoteCals = await listRemoteCalendars()
  const toSyncRemoteCalendarIds = remoteCals.map(cal => cal.id)
  const deletedRemoteCalendarIds = remoteCals.filter(rec => { if (rec.deleted) return true }).map(cal => cal.id)
  const result      = await GoogleCalendar.persistRemoteCalendars(googleCredential.id, toSyncRemoteCalendarIds)
  const pesistedCal = await GoogleCalendar.get(result[0])

  expect(result.length).to.be.equal(toSyncRemoteCalendarIds.length - deletedRemoteCalendarIds.length)
  expect(pesistedCal.id).to.be.equal(result[0])
  expect(pesistedCal.google_credential).to.be.equal(googleCredential.id)
  expect(pesistedCal.origin).to.be.equal('google')
  expect(pesistedCal.type).to.be.equal('google_calendars')
}

async function create() {
  const id = await GoogleCalendar.create(googleCredential.id)
  const calendar = await GoogleCalendar.get(id)

  expect(calendar.google_credential).to.be.equal(googleCredential.id)
  expect(calendar.type).to.be.equal('google_calendars')
}



describe('Google', () => {
  describe('Google Calendars', () => {
    createContext()
    beforeEach(setup)

    // it('should create a google calendar', createLocal)
    // it('should update a google calendar', updateLocal)
    // it('should persist a remote google calendar into disk', persistRemoteCalendar)
    // it('should fail in get by remote calendar id', getByRemoteCalendarIdFiled)
    // it('should return a calendar by remote calendar id', getByRemoteCalendarId)
    // it('should delete a local calendar by remote calendar id', deleteLocalByRemoteCalendarId)
    // it('should fail in get by id', getFailed)
    // it('should return a calendar by channel id', getByWatcherChannelId)
    // it('should return calendars by channel credential id', getAllByGoogleCredential)
    // it('should update a calendar\'s sync_token', updateSyncToken)
    // it('should stop to sync', stopSync)

    it('should return a list of remote google calendars', listRemoteCalendars)
    it('should persist remote google calendars without any ToSync calendars', persistRemoteCalendarsSimple)
    it('should persist remote google calendars', persistRemoteCalendars)
    it('should create a remote google calendars', create)
  })
})