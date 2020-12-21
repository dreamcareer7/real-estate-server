const { expect } = require('chai')
const { createContext } = require('../helper')
const BrandHelper       = require('../brand/helper')

const Context = require('../../../lib/models/Context')
const User    = require('../../../lib/models/User/get')
const Contact = require('../../../lib/models/Contact/manipulate')
const ContactIntegration = require('../../../lib/models/ContactIntegration')

const { createGoogleCredential, createGoogleContact }     = require('../google/helper')
const { createMicrosoftMessages, createMicrosoftContact } = require('../microsoft/helper')

const { attributes } = require('../contact/helper')

/** @type {RequireProp<ITaskInput, 'brand' | 'created_by'>} */
let user, brand, googleContact, microsoftContact
let integration_records = []



async function createContacts() {
  return Contact.create([
    {
      user: user.id,
      attributes: attributes({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@doe.com',
      }),
    },
    {
      user: user.id,
      attributes: attributes({
        first_name: 'John',
        last_name: 'smith',
        email: 'john@smith.com',
      }),
    }
  ], user.id, brand.id)
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  const { credential: googleCredential }    = await createGoogleCredential(user, brand)
  const { credential: microsoftCredential } = await createMicrosoftMessages(user, brand)

  googleContact    = await createGoogleContact(googleCredential)
  microsoftContact = await createMicrosoftContact(microsoftCredential)

  const result = await createContacts()

  integration_records = [
    {
      google_id: googleContact.id,
      microsoft_id: null,
      contact: result[0],
      origin: 'google',
      etag: 'etag',
      local_etag: 'local_etag'
    },
    {
      google_id: null,
      microsoft_id: microsoftContact.id,
      contact: result[1],
      origin: 'microsoft',
      etag: 'etag',
      local_etag: 'local_etag'
    }
  ]

  Context.set({ user, brand, googleContact, microsoftContact })
}

async function insert() {
  const result = await ContactIntegration.insert(integration_records)

  expect(result.length).to.be.equal(integration_records.length)
  
  expect(result[0].google_id).to.be.equal(googleContact.id)
  expect(result[0].microsoft_id).to.be.equal(null)
  
  expect(result[1].microsoft_id).to.be.equal(microsoftContact.id)
  expect(result[1].google_id).to.be.equal(null)

  return result

  /*
    [
      {

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
    contact: result[0].contact
  }]

  const upserted = await ContactIntegration.gupsert(arr)
  expect(upserted.length).to.be.equal(arr.length)
  
  const record = await ContactIntegration.get(result[0].id)

  expect(record.google_id).to.be.equal(googleContact.id)
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
    contact: result[1].contact
  }]

  const upserted = await ContactIntegration.mupsert(arr)
  expect(upserted.length).to.be.equal(arr.length)

  const record = await ContactIntegration.get(result[1].id)

  expect(record.microsoft_id).to.be.equal(microsoftContact.id)
  expect(record.google_id).to.be.equal(null)
  expect(record.etag).to.be.equal('updated_etag_x')
  expect(record.local_etag).to.be.equal('updated_etag_x') 
}

async function getAll() {
  const result = await insert()
  const ids = result.map(r => r.id)
  const records = await ContactIntegration.getAll(ids)

  expect(records.length).to.be.equal(integration_records.length)

  expect(records[1].google_id).to.be.equal(googleContact.id)
  expect(records[1].microsoft_id).to.be.equal(null)
  
  expect(records[0].microsoft_id).to.be.equal(microsoftContact.id)
  expect(records[0].google_id).to.be.equal(null)

  return records
}

async function get() {
  const result = await insert()
  const record = await ContactIntegration.get(result[0].id)

  expect(record.google_id).to.be.equal(googleContact.id)
  expect(record.microsoft_id).to.be.equal(null)

  return record
}

async function getFailed() {
  try {
    await ContactIntegration.get(user.id)
  } catch (err) {
    expect(err.message).to.be.equal(`Contact integration by id ${user.id} not found.`)
  }
}

async function getByGoogleIds() {
  const allRecords = await getAll()
  const records    = await ContactIntegration.getByGoogleIds([allRecords[1].google_id])

  expect(records.length).to.be.equal(1)
  
  expect(records[0].google_id).to.be.equal(googleContact.id)
  expect(records[0].microsoft_id).to.be.equal(null)

  return records
}

async function getByMicrosoftIds() {
  const allRecords = await getAll()
  const records    = await ContactIntegration.getByMicrosoftIds([allRecords[0].microsoft_id])

  expect(records.length).to.be.equal(1)
  
  expect(records[0].microsoft_id).to.be.equal(microsoftContact.id)
  expect(records[0].google_id).to.be.equal(null)

  return records
}

async function getByContacts() {
  const allRecords = await getAll()
  const records    = await ContactIntegration.getByContacts([allRecords[1].contact])

  expect(records.length).to.be.equal(0)
}

async function microsoft_resetEtagByContact() {
  const result_1 = await insert()
  const record_1 = await ContactIntegration.get(result_1[0].id)
  expect(record_1.local_etag).to.be.equal('local_etag')

  await ContactIntegration.resetEtagByContact([record_1.crm_task], 'microsoft')
  const updated_1 = await ContactIntegration.get(result_1[0].id)
  expect(updated_1.local_etag).to.be.equal(null)
}

async function google_resetEtagByContact() {
  const result = await insert()
  const record = await ContactIntegration.get(result[1].id)
  expect(record.local_etag).to.be.equal('local_etag')

  await ContactIntegration.resetEtagByContact([record.crm_task], 'google')
  const updated = await ContactIntegration.get(result[1].id)
  expect(updated.local_etag).to.be.equal(null)
}

async function rechat_resetEtagByContact() {
  const result  = await insert()
  const records = await ContactIntegration.getAll([result[0].id, result[1].id])

  expect(records[0].local_etag).to.be.equal('local_etag')
  expect(records[1].local_etag).to.be.equal('local_etag')

  await ContactIntegration.resetEtagByContact([result[0].crm_task, result[1].crm_task], 'rechat')
  const updated = await ContactIntegration.getAll([result[0].id, result[1].id])

  expect(updated[0].local_etag).to.be.equal(null)
  expect(updated[1].local_etag).to.be.equal(null)
}

async function deleteMany() {
  const records = await insert()
  
  await ContactIntegration.deleteMany([records[0].id])

  const updated = await ContactIntegration.get(records[0].id)

  expect(updated.id).to.be.equal(records[0].id)
  expect(updated.deleted_at).to.be.not.equal(null)
}


describe('Google', () => {
  describe('Google Contacts', () => {
    createContext()
    beforeEach(setup)

    it('should create several Contact integration records', insert)
    it('should create several Google Contact integration records', gupsert)
    it('should create several Microsoft Contact integration records', mupsert)

    it('should return several Contact integration records', getAll)
    it('should return a Contact integration record', get)
    it('should fail in get by id', getFailed)
    it('should return several Contact integration records by google_ids', getByGoogleIds)
    it('should return several Contact integration records by microsoft_ids', getByMicrosoftIds)
    it('should return a Contact integration records by contact', getByContacts)
    it('should reset etag property, caused by microsoft', microsoft_resetEtagByContact)
    it('should reset etag property, caused by google', google_resetEtagByContact)
    it('should reset etag property, caused by rechat', rechat_resetEtagByContact)
    it('should delete several Contact integration records', deleteMany)
  })
})
