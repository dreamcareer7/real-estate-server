const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const CalendarIntegration   = require('../../../lib/models/Calendar/integration')

const { createGoogleMessages, createGoogleCalendarEvent } = require('../google/helper')
const { createMicrosoftMessages } = require('../microsoft/helper')


let user, brand, googleCredential, microsoftCredential, googleCalendar



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential: googleCredential }    = await createGoogleMessages(user, brand)
  const { credential: microsoftCredential } = await createMicrosoftMessages(user, brand)

  Context.set({ user, brand, googleCredential, microsoftCredential })
}

async function bulkUpsert() {
  const result = await CalendarIntegration.bulkUpsert([])

  return result
}

async function getAll() {
  const result = await bulkUpsert()

  const ids = result.map(r => r.id)

  const records = await CalendarIntegration.getAll(ids)

  expect(records[0].type).to.be.equal('google_calendars')

  return records
}

async function get() {
  const record = await CalendarIntegration.get(id)
}

async function getFailed() {
  try {
    await CalendarIntegration.get(googleCredential.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Google calendar by id ${googleCredential.id} not found.`)
  }
}

async function deleteMany() {
  const records = await bulkUpsert()
  
  await CalendarIntegration.deleteMany(records[0])

  const updated = await CalendarIntegration.get(records[0].id)

  expect(updated.id).to.be.equal(records[0].id)
  expect(updated.deleted_at).to.be.not.equal(null)
}



describe('Google', () => {
  describe('Google Calendars', () => {
    createContext()
    beforeEach(setup)

    it('should create several calendar integration records', bulkUpsert)
    it('should return several calendar integration records', getAll)
    it('should return a calendar integration record', get)
    it('should fail in get by id', getFailed)
    it('should delete several calendar integration records', deleteMany)
  })
})