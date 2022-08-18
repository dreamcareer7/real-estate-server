const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const AttachedFile = require('../../../lib/models/AttachedFile')
const Contact = {
  ...require('../../../lib/models/Contact/get'),
  ...require('../../../lib/models/Contact/filter'),
}
const ImportWorker = require('../../../lib/models/Contact/worker/import')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User/get')

const BrandHelper = require('../brand/helper')

const contacts_json = require('../analytics/data/contacts')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
  })
  Context.set({ user, brand })
}

async function testImportFromCsv() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('../../functional/suites/data/csv_mappings')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total } = await Contact.filter(brand.id, [], { limit: 1 })
  expect(total).to.be.equal(192)
}

async function testCsvFullAddressColumns() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts-full-address-column.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('./data/fulladdress-mapping.json')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total, ids } = await Contact.filter(brand.id, [])
  expect(total).to.be.equal(1)

  const contact = await Contact.get(ids[0])
  expect(contact.address).not.to.be.null
  expect(contact.address[0]).to.include({
    city: 'Sandy Springs',
    full: '5673 Peachtree Dunwoody Rd Suite 850, Sandy Springs GA 30342',
    name: 'Peachtree Dunwoody Rd',
    type: 'stdaddr',
    unit: 'Suite 850',
    extra: 'Home',
    line1: '5673 Peachtree Dunwoody Rd Suite 850',
    line2: 'Sandy Springs GA 30342',
    state: 'GA',
    postcode: '30342',
    house_num: '5673'
  })
}

async function testCsvFullAddressColumns3() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, './data/full-address-bogus.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('./data/full-address-bogus.json')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total } = await Contact.filter(brand.id, [])
  expect(total).to.be.equal(1)
}

async function testCsvFullAddressColumns2() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, './data/fulladdress2.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('./data/fulladdress-mapping.json')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total, ids } = await Contact.filter(brand.id, [])
  expect(total).to.be.equal(1)

  const contact = await Contact.get(ids[0])
  expect(contact.address).not.to.be.null
  expect(contact.address[0]).to.include({
    house_num: '1496', name: 'Trudie Park'
  })
}

async function testCsvSameNameColumns() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts-multiple-tag-columns.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('./data/multiple-tag-columns-mapping.json')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total, ids } = await Contact.filter(brand.id, [])
  expect(total).to.be.equal(1)

  const contact = await Contact.get(ids[0])
  expect(contact.tags).to.have.members(['Tag1','Tag2','Tag3'])
}

async function testCsvMultiTagColumn() {
  const file = await AttachedFile.saveFromStream({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts-multi-tag-column.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [
      {
        role: 'Brand',
        role_id: brand.id
      }
    ],
    public: false
  })

  const mappings = require('./data/multi-tag-mapping.json')
  ImportWorker.import_csv(user.id, brand.id, file.id, user.id, mappings)

  await handleJobs()

  const { total, ids } = await Contact.filter(brand.id, [])
  expect(total).to.be.equal(1)

  const contact = await Contact.get(ids[0])
  expect(contact.tags).to.have.members(['Tag1','Tag2','Tag3'])
}

async function testImportFromJson() {
  ImportWorker.import_json(contacts_json.map(c => ({ ...c, user: user.id })), user.id, brand.id)

  await handleJobs()

  const contacts = await Contact.getForBrand(brand.id, [], {})
  expect(contacts).to.have.length(3)
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Import', () => {
    it('should import contacts from csv', testImportFromCsv)
    it('should parse and import full address columns', testCsvFullAddressColumns)
    it('should parse and import full address column without unit number', testCsvFullAddressColumns2)
    it('should parse and import unparseable full address column', testCsvFullAddressColumns3)
    it('should parse and import multiple columns with the same name', testCsvSameNameColumns)
    it('should parse and import comma-separated multi valued columns', testCsvMultiTagColumn)
    it('should import contacts from json', testImportFromJson)
  })
})
