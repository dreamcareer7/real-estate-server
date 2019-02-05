const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const promisify = require('../../../lib/utils/promisify')

const AttachedFile = require('../../../lib/models/AttachedFile')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

const mappings = require('../../functional/suites/data/csv_mappings')
const contacts_json = require('../analytics/data/contacts.json')

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
  const file = await promisify(AttachedFile.saveFromStream)({
    stream: fs.createReadStream(path.resolve(__dirname, '../../functional/suites/data/contacts.csv')),
    filename: 'contacts.csv',
    user,
    path: user.id + '-' + Date.now().toString(),
    relations: [{
      role: 'Brand',
      id: brand.id
    }],
    public: false
  })

  const job = Job.queue
    .create('contact_import', {
      mappings,
      file_id: file.id,
      owner: user.id,
      type: 'import_csv',
      user_id: user.id,
      brand_id: brand.id
    })

  Context.get('jobs').push(job)

  await handleJobs()

  const contacts = await Contact.getForBrand(brand.id, [], {})
  expect(contacts).to.have.length(192)
}

async function testImportFromJson() {
  const job = Job.queue
    .create('contact_import', {
      type: 'import_json',
      contacts: contacts_json.map(c => ({ ...c, user: user.id })),
      user_id: user.id,
      brand_id: brand.id
    })

  Context.get('jobs').push(job)

  await handleJobs()

  const contacts = await Contact.getForBrand(brand.id, [], {})
  expect(contacts).to.have.length(3)
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Import', () => {
    it('should import contacts from csv', testImportFromCsv)
    it('should import contacts from json', testImportFromJson)
  })
})
