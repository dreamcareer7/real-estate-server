const { expect } = require('chai')
const { createContext } = require('../helper')

const Context           = require('../../../lib/models/Context')
const User              = require('../../../lib/models/User')
const BrandHelper       = require('../brand/helper')
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
}



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


describe('Google', () => {
  describe('Google Calendars', () => {
    createContext()
    beforeEach(setup)

    it('should create a google calendar', createLocal)
    it('should update a google calendar', updateLocal)
    it('should persist a remote google calendar into disk', persistRemoteCalendar)
    it('should fail in get by remote calendar id', getByRemoteCalendarIdFiled)
    it('should return a calendar by remote calendar id', getByRemoteCalendarId)
  })
})