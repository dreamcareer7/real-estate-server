const { expect } = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User')
const BrandHelper         = require('../brand/helper')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')
const MicrosoftCalendar   = require('../../../lib/models/Microsoft/calendar')

const { createMicrosoftMessages, createMicrosoftCalendar } = require('./helper')
const calendars = require('./data/calendars.json')

let user, brand, microsoftCredential



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential } = await createMicrosoftMessages(user, brand)
  microsoftCredential = credential

  Context.set({ user, brand, microsoftCredential })
}

async function createLocal() {
  return await createMicrosoftCalendar(microsoftCredential.id)
}

async function getByRemoteCalendarIdFiled() {
  const cal = await MicrosoftCalendar.getByRemoteCalendarId(microsoftCredential.id, 'xxxx')
  expect(cal).to.be.equal(null)
}

async function getByRemoteCalendarId() {
  const cal = await createLocal()
  const alt = await MicrosoftCalendar.getByRemoteCalendarId(microsoftCredential.id, cal.calendar_id)

  expect(cal.id).to.be.equal(alt.id)
  expect(cal.calendar_id).to.be.equal(alt.calendar_id)
}

async function deleteLocalByRemoteCalendarId() {
  const cal = await createLocal()
  
  await MicrosoftCalendar.deleteLocalByRemoteCalendarId(cal)

  const updated = await MicrosoftCalendar.get(cal.id)

  expect(updated.id).to.be.equal(cal.id)
  expect(updated.deleted_at).to.be.not.equal(null)
  expect(updated.deleted).to.be.not.equal(true)
}

async function getFailed() {
  try {
    await MicrosoftCalendar.get(microsoftCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Microsoft calendar by id ${microsoftCredential.id} not found.`)
  }
}

async function getAllByMicrosoftCredential() {
  await createLocal()
  const calendars = await MicrosoftCalendar.getAllByMicrosoftCredential(microsoftCredential.id)

  expect(calendars.length).to.be.equal(1)
  expect(calendars[0].type).to.be.equal('microsoft_calendars')
}

async function listRemoteCalendars() {
  const result = await MicrosoftCalendar.listRemoteCalendars(microsoftCredential.id)

  expect(result.length).to.be.not.equal(0)
  expect(result[0].name).to.be.equal('Calendar')

  return result
}

async function persistRemoteCalendarsSimple() {
  const result = await MicrosoftCalendar.persistRemoteCalendars(microsoftCredential.id, [])

  expect(result.activeCalendarIds.length).to.be.equal(0)
}

async function persistRemoteCalendars() {
  const remoteCals = await listRemoteCalendars()
  const toSyncRemoteCalendarIds = remoteCals.map(cal => cal.id)
  const result      = await MicrosoftCalendar.persistRemoteCalendars(microsoftCredential.id, toSyncRemoteCalendarIds)
  const pesistedCal = await MicrosoftCalendar.get(result.activeCalendarIds[0])
  expect(result.activeCalendarIds.length).to.be.equal(toSyncRemoteCalendarIds.length)
  expect(pesistedCal.id).to.be.equal(result.activeCalendarIds[0])
  expect(pesistedCal.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(pesistedCal.origin).to.be.equal('rechat')
  expect(pesistedCal.type).to.be.equal('microsoft_calendars')
}

async function create() {
  const body = calendars.remote_cal_1

  const id = await MicrosoftCalendar.create(microsoftCredential.id, body)
  const calendar = await MicrosoftCalendar.get(id)

  expect(calendar.microsoft_credential).to.be.equal(microsoftCredential.id)
  expect(calendar.type).to.be.equal('microsoft_calendars')
  expect(calendar.name).to.be.equal(body.name)
}

async function getRemoteMicrosoftCalendars() {
  const result = await MicrosoftCalendar.getRemoteMicrosoftCalendars(microsoftCredential)

  expect(result.calendars.length).to.be.equal(3)
  expect(result.currentSelectedCal).to.be.equal(null)

  return result
}

async function configureCalendars() {
  const data = await getRemoteMicrosoftCalendars()

  const conf = {
    toSync: [data.calendars[0].id, data.calendars[1].id],
    toStopSync: []
  }

  expect(microsoftCredential.microsoft_calendar).to.be.equal(null)

  await MicrosoftCalendar.configureCalendars(microsoftCredential, conf)

  const updatedMicrosoftCredential = await MicrosoftCredential.get(microsoftCredential.id)
  
  expect(updatedMicrosoftCredential.microsoft_calendar).to.be.not.equal(null)

  const rechatCalendar = await MicrosoftCalendar.get(updatedMicrosoftCredential.microsoft_calendar)

  expect(rechatCalendar.microsoft_credential).to.be.equal(microsoftCredential.id)

  return rechatCalendar
}

async function configureCalendarsFails() {
  const conf = {
    'toStopSync': ['x', 'y', 'z'],
    'toSync': ['x', 'm', 'k']
  }

  try {
    await MicrosoftCalendar.configureCalendars(microsoftCredential, conf)
  } catch (ex) {
    expect(ex.message).to.be.equal('Microsoft calendar by id x not found.')
  }
}


describe('Microsoft', () => {
  describe('Microsoft Calendars', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft calendar', createLocal)
    it('should fail in get by remote calendar id', getByRemoteCalendarIdFiled)
    it('should return a calendar by remote calendar id', getByRemoteCalendarId)
    it('should delete a local calendar by remote calendar id', deleteLocalByRemoteCalendarId)
    it('should fail in get by id', getFailed)
    it('should return calendars by channel credential id', getAllByMicrosoftCredential)
    
    it('should return a list of remote microsoft calendars', listRemoteCalendars)
    it('should persist remote microsoft calendars without any ToSync calendars', persistRemoteCalendarsSimple)
    it('should persist remote microsoft calendars', persistRemoteCalendars)
    it('should create a remote microsoft calendars', create)
    it('should return an object of remote microsoft calendars', getRemoteMicrosoftCalendars)
    it('should config microsoft calendars', configureCalendars)
    it('should handle bad configs', configureCalendarsFails)
  })
})