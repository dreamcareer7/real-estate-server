const { expect } = require('chai')
const { createContext } = require('../helper')
const BrandHelper       = require('../brand/helper')

const Context = require('../../../lib/models/Context')
const User    = require('../../../lib/models/User/get')
const CrmTask = require('../../../lib/models/CRM/Task')
const Contact = require('../../../lib/models/Contact/manipulate')
const CalendarIntegration = require('../../../lib/models/CalendarIntegration')

const { createGoogleMessages, createGoogleCalendarEvent }       = require('../google/helper')
const { createMicrosoftMessages, createMicrosoftCalendarEvent } = require('../microsoft/helper')

const { attributes } = require('../contact/helper')

/** @type {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
let base_task
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



async function createContact() {
  return Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)
}

async function createTwoTasks() {
  const [contact] = await createContact()
  
  return CrmTask.createMany([{
    ...base_task,
    associations: [{
      association_type: 'contact',
      contact
    }],
    reminders: [{
      is_relative: false,
      timestamp: base_task.due_date - 3600
    }]
  }, {
    ...base_task,
    due_date: Date.now() / 1000 + 86400,
    assignees: []
  }])
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential: googleCredential }    = await createGoogleMessages(user, brand)
  const { credential: microsoftCredential } = await createMicrosoftMessages(user, brand)

  googleEvent    = await createGoogleCalendarEvent(googleCredential)
  microsoftEvent = await createMicrosoftCalendarEvent(microsoftCredential)

  base_task = {
    created_by: user.id,
    brand: brand.id,
    assignees: [user.id],
    due_date: Date.now() / 1000,
    title: 'Test assignment',
    task_type: 'Call',
    status: 'PENDING'
  }

  const result = await createTwoTasks()

  integration_records = [
    {
      google_id: googleEvent.id,
      microsoft_id: null,
      crm_task: result[0],
      contact: null,
      contact_attribute: null,
      deal_context: null,
      object_type: 'crm_task',
      event_type: 'Other',
      origin: 'google',
      etag: 'etag',
      local_etag: 'local_etag'
    },
    {
      google_id: null,
      microsoft_id: microsoftEvent.id,
      crm_task: result[1],
      contact: null,
      contact_attribute: null,
      deal_context: null,
      object_type: 'crm_task',
      event_type: 'Other',
      origin: 'microsoft',
      etag: 'etag',
      local_etag: 'local_etag'
    }
  ]

  Context.set({ user, brand, googleEvent, microsoftEvent })
}

async function insert() {
  const result = await CalendarIntegration.insert(integration_records)

  expect(result.length).to.be.equal(integration_records.length)
  
  expect(result[0].google_id).to.be.equal(googleEvent.id)
  expect(result[0].microsoft_id).to.be.equal(null)
  expect(result[0].object_type).to.be.equal('crm_task')
  
  expect(result[1].object_type).to.be.equal('crm_task')
  expect(result[1].microsoft_id).to.be.equal(microsoftEvent.id)
  expect(result[1].google_id).to.be.equal(null)

  return result

  /*
    [
      {
        id: '1bc397e1-bbe2-41ff-9ec1-8c651dd18dc9',
        google_id: 'b796f2c3-6816-4e90-94a7-07b38e0c4711',
        microsoft_id: null,
        crm_task: '2f656cb5-e9bb-4c35-aabb-e1360b82272a',
        contact: null,
        contact_attribute: null,
        deal_context: null,
        object_type: 'crm_task',
        event_type: 'Other',
        origin: 'google'
      },
      {
        id: '774a9bdb-7b44-4b5f-bb6a-91e695ae6ece',
        google_id: null,
        microsoft_id: '80c439d8-8347-4721-a745-2906d436d1af',
        crm_task: 'd1282324-c16c-4dfb-8d38-293abf736e77',
        contact: null,
        contact_attribute: null,
        deal_context: null,
        object_type: 'crm_task',
        event_type: 'Other',
        origin: 'microsoft'
      }
    ]
  */
}

async function gupsert() {
  const result = await insert()

  const arr = [{
    google_id: result[0].google_id,
    etag: 'updated_etag',
    local_etag: 'updated_etag',
    crm_task: result[0].crm_task
  }]

  const upserted = await CalendarIntegration.gupsert(arr)
  expect(upserted.length).to.be.equal(arr.length)
  
  const record = await CalendarIntegration.get(result[0].id)

  expect(record.google_id).to.be.equal(googleEvent.id)
  expect(record.microsoft_id).to.be.equal(null)
  expect(record.etag).to.be.equal('updated_etag')
  expect(record.local_etag).to.be.equal('updated_etag')  
}

async function mupsert() {
  const result = await insert()

  const arr = [{
    microsoft_id: result[1].microsoft_id,
    etag: 'updated_etag_x',
    local_etag: 'updated_etag_x',
    crm_task: result[1].crm_task
  }]

  const upserted = await CalendarIntegration.mupsert(arr)
  expect(upserted.length).to.be.equal(arr.length)

  const record = await CalendarIntegration.get(result[1].id)

  expect(record.microsoft_id).to.be.equal(microsoftEvent.id)
  expect(record.google_id).to.be.equal(null)
  expect(record.etag).to.be.equal('updated_etag_x')
  expect(record.local_etag).to.be.equal('updated_etag_x') 
}

async function getAll() {
  const result = await insert()
  const ids = result.map(r => r.id)
  const records = await CalendarIntegration.getAll(ids)

  expect(records.length).to.be.equal(integration_records.length)

  expect(records[1].google_id).to.be.equal(googleEvent.id)
  expect(records[1].microsoft_id).to.be.equal(null)
  expect(records[1].object_type).to.be.equal('crm_task')
  
  expect(records[0].object_type).to.be.equal('crm_task')
  expect(records[0].microsoft_id).to.be.equal(microsoftEvent.id)
  expect(records[0].google_id).to.be.equal(null)

  return records
}

async function get() {
  const result = await insert()
  const record = await CalendarIntegration.get(result[0].id)

  expect(record.google_id).to.be.equal(googleEvent.id)
  expect(record.microsoft_id).to.be.equal(null)
  expect(record.object_type).to.be.equal('crm_task')

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

  expect(records.length).to.be.equal(1)
  
  expect(records[0].google_id).to.be.equal(googleEvent.id)
  expect(records[0].microsoft_id).to.be.equal(null)
  expect(records[0].object_type).to.be.equal('crm_task')

  return records
}

async function getByMicrosoftIds() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByMicrosoftIds([allRecords[0].microsoft_id])

  expect(records.length).to.be.equal(1)
  
  expect(records[0].microsoft_id).to.be.equal(microsoftEvent.id)
  expect(records[0].google_id).to.be.equal(null)
  expect(records[0].object_type).to.be.equal('crm_task')

  return records
}

async function getByCrmTasks() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByCrmTasks([allRecords[1].crm_task])

  expect(records[0].google_id).to.be.equal(googleEvent.id)
  expect(records[0].microsoft_id).to.be.equal(null)
  expect(records[0].object_type).to.be.equal('crm_task')

  return records
}

async function getByContacts() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByContacts([allRecords[1].contact])

  expect(records.length).to.be.equal(0)
}

async function getByContactAttributes() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByContactAttributes([allRecords[1].contact_attribute])

  expect(records.length).to.be.equal(0)
}

async function getByDealContexts() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByDealContexts([allRecords[1].deal_context])

  expect(records.length).to.be.equal(0)
}

async function getByHomeAnniversaries() {
  const allRecords = await getAll()
  const records    = await CalendarIntegration.getByHomeAnniversaries([allRecords[1].deal_context])

  expect(records.length).to.be.equal(0)
}

async function microsoft_resetEtagByCrmTask() {
  const result_1 = await insert()
  const record_1 = await CalendarIntegration.get(result_1[0].id)
  expect(record_1.local_etag).to.be.equal('local_etag')

  await CalendarIntegration.resetEtagByCrmTask([record_1.crm_task], 'microsoft')
  const updated_1 = await CalendarIntegration.get(result_1[0].id)
  expect(updated_1.local_etag).to.be.equal(null)
}

async function google_resetEtagByCrmTask() {
  const result = await insert()
  const record = await CalendarIntegration.get(result[1].id)
  expect(record.local_etag).to.be.equal('local_etag')

  await CalendarIntegration.resetEtagByCrmTask([record.crm_task], 'google')
  const updated = await CalendarIntegration.get(result[1].id)
  expect(updated.local_etag).to.be.equal(null)
}

async function rechat_resetEtagByCrmTask() {
  const result  = await insert()
  const records = await CalendarIntegration.getAll([result[0].id, result[1].id])

  expect(records[0].local_etag).to.be.equal('local_etag')
  expect(records[1].local_etag).to.be.equal('local_etag')

  await CalendarIntegration.resetEtagByCrmTask([result[0].crm_task, result[1].crm_task], 'rechat')
  const updated = await CalendarIntegration.getAll([result[0].id, result[1].id])

  expect(updated[0].local_etag).to.be.equal(null)
  expect(updated[1].local_etag).to.be.equal(null)
}

async function deleteMany() {
  const records = await insert()
  
  await CalendarIntegration.deleteMany([records[0].id])

  const updated = await CalendarIntegration.get(records[0].id)

  expect(updated.id).to.be.equal(records[0].id)
  expect(updated.deleted_at).to.be.not.equal(null)
}


describe('Calendar Integration', () => {
  createContext()
  beforeEach(setup)

  it('should create several calendar integration records', insert)
  it('should create several Google calendar integration records', gupsert)
  it('should create several Microsoft calendar integration records', mupsert)

  it('should return several calendar integration records', getAll)
  it('should return a calendar integration record', get)
  it('should fail in get by id', getFailed)
  it('should return several calendar integration records by google_ids', getByGoogleIds)
  it('should return several calendar integration records by microsoft_ids', getByMicrosoftIds)
  it('should return a calendar integration records by crm_task', getByCrmTasks)
  it('should return a calendar integration records by contact', getByContacts)
  it('should return a calendar integration records by contact_attribute', getByContactAttributes)
  it('should return a calendar integration records by deal_context', getByDealContexts)
  it('should return a calendar integration records by home_anniversary', getByHomeAnniversaries)
  it('should reset etag property, caused by microsoft', microsoft_resetEtagByCrmTask)
  it('should reset etag property, caused by google', google_resetEtagByCrmTask)
  it('should reset etag property, caused by rechat', rechat_resetEtagByCrmTask)
  it('should delete several calendar integration records', deleteMany)
})
