const uuid       = require('uuid')
const { expect } = require('chai')
const { createContext } = require('../helper')
const BrandHelper       = require('../brand/helper')

const Context = require('../../../lib/models/Context')
const User    = require('../../../lib/models/User')
const CalendarIntegration = require('../../../lib/models/Calendar/integration')

const { createGoogleMessages, createGoogleCalendarEvent }       = require('../google/helper')
const { createMicrosoftMessages, createMicrosoftCalendarEvent } = require('../microsoft/helper')

let user, brand, googleEvent, microsoftEvent


// const mapping = {
//   'object_types': ['crm_task', 'deal_context', 'contact_attribute', 'contact'],
//   'event_types': ['birthday', 'child_birthday', 'important_date', 'wedding_anniversary', 'work_anniversary', 'home_anniversary', 'next_touch', 'Other'],

//   'crm_task': ['Other'],
//   'deal_context': [],
//   'contact_attribute': ['birthday', 'child_birthday', 'important_date', 'wedding_anniversary', 'work_anniversary', 'home_anniversary'],
//   'contact': ['next_touch']
// }

let integration_records = []



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential: googleCredential }    = await createGoogleMessages(user, brand)
  const { credential: microsoftCredential } = await createMicrosoftMessages(user, brand)

  googleEvent    = await createGoogleCalendarEvent(googleCredential)
  microsoftEvent = await createMicrosoftCalendarEvent(microsoftCredential)

  integration_records = [
    {
      rechat_id: uuid.v4(),
      google_id: googleEvent.id,
      microsoft_id: null,
      object_type: 'crm_task',
      event_type: 'Other',
      origin: 'google'
    },
    {
      rechat_id: uuid.v4(),
      google_id: null,
      microsoft_id: microsoftEvent.id,
      object_type: 'crm_task',
      event_type: 'Other',
      origin: 'microsoft'
    }
  ]

  Context.set({ user, brand, googleEvent, microsoftEvent })
}

async function bulkUpsert() {
  return await CalendarIntegration.bulkUpsert(integration_records)
}

async function getAll() {
  const result = await bulkUpsert()
  const ids = result.map(r => r.id)
  const records = await CalendarIntegration.getAll(ids)

  expect(records.length).to.be.equal(integration_records.length)
  expect(records[0].type).to.be.equal('calendar_integration')
  expect(records[0].deleted_at).to.be.equal(null)

  return records
}

async function get() {
  const result = await bulkUpsert()
  const record = await CalendarIntegration.get(result[0].id)

  return record
}

async function getFailed() {
  try {
    await CalendarIntegration.get(user.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Calendar integration by id ${user.id} not found.`)
  }
}

async function getByGoogleIds() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByGoogleIds([allRecords[1].google_id])

  return records
}

async function deleteMany() {
  const records = await bulkUpsert()
  
  await CalendarIntegration.deleteMany([records[0].id])

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
    it('should return several calendar integration records by google_ids', getByGoogleIds)
    it('should delete several calendar integration records', deleteMany)
  })
})