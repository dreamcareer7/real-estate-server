const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')

const promisify = require('../../../lib/utils/promisify')

const { Listing } = require('../../../lib/models/Listing')
const Orm = require('../../../lib/models/Orm/context')
const Email = require('../../../lib/models/Email/get')
const sql = require('../../../lib/utils/sql')
const json = require('./json/listing.json')
const property = require('./json/property.json')
const address = require('./json/address.json')
const User = require('../../../lib/models/User/get')
const Photo = require('../../../lib/models/Photo')
const { addAgent } = require('../../../lib/models/User/upgrade')
const BrandHelper = require('../brand/helper')

const Agent = {
  ...require('../../../lib/models/Agent'),
  ...require('../../../lib/models/Agent/orm'),
}

const photoJson = require('./json/photo.json')
const agentsJson = require('./json/agent.json')

const save = async () => {
  const saved = await promisify(Listing.create)({
    listing: json,
    property,
    address,
    revision: 1
  })

  return saved.listing.id
}

const getEmails =  async () => {
  Orm.setPublicFields({ select: { email: ['html', 'text'] }, omit: {} })

  const ids = await sql.selectIds(`
    SELECT
      id
    FROM
      emails
  `)

  return Email.getAll(ids)
}

const justSold = async () => {
  const user = await User.getByEmail('test@rechat.com')

  const template = {
    name: 'fake-template-brand-trigger-test',
    variant: 'Template40',
    inputs: ['listing', 'user'],
    template_type: 'JustSold',
    medium: 'Email',
    html: '<div>fakeTemplate</div>',
    mjml: false,
  }
  
  const createBrand = async () => {
    return BrandHelper.create({
      roles: {
        Agent: { acl: ['Marketing'], members: [user.id] }
      },
      checklists: [],
      contexts: [],
      templates: [template],
    })
  }

  await createBrand()

  const agentId = await Agent.create({
    ...agentsJson,
    status: 'Active'
  })

  await promisify(addAgent)(user?.id, agentId)

  // create the new listing with revision 1 and active status
  await promisify(Listing.create)({
    listing: {
      ...json,
      status: 'Active'
    },
    property,
    address,
    revision: 1
  })

  // upsert above listing to justSold. as you can see revision is 2
  await promisify(Listing.create)({
    listing: {
      ...json,
      status: 'Sold'
    },
    property,
    address,
    revision: 2 // << this is important for upsert
  })

  await Photo.create(photoJson)

  await handleJobs()
  
  const emails = await getEmails()
  
  if (emails.length === 0) {
    throw new Error('No emails found!')
  }

  //TODO we must find a better way to check whether this is the justSold Email or not of course
  const targetEmail = emails[0]
  if (!targetEmail.subject.includes('Just Sold!')) {
    throw new Error('Just Sold Email not found')
  }
}

const get = async () => {
  const id = await save()
  const listing = await promisify(Listing.get)(id)

  expect(listing.id).to.equal(id)
}

const getAll = async () => {
  const id = await save()
  const listings = await Listing.getAll([id])

  const ids = listings.map(l => l.id)

  expect(ids).to.include(id)
}

const getCompacts = async () => {
  const id = await save()
  const listings = await Listing.getCompacts([id])

  const ids = listings.map(l => l.id)

  expect(ids).to.include(id)
}

const getByMLSNumber = async () => {
  const id = await save()
  const listings = await Listing.getByMLSNumber(json.mls_number)

  expect(listings[0].id).to.equal(id)
}

const getByMUI = async () => {
  const id = await save()
  const listing = await Listing.getByMUI(json.matrix_unique_id, json.mls)

  expect(listing.id).to.equal(id)
}

const searchAddress = async () => {
  const id = await save()
  const listing = await promisify(Listing.get)(id)

  const query = listing.property.address.street_address
  const status = [ listing.status ]
  const limit = 1

  const found = await Listing.stringSearch({query, status, limit})

  expect(found).not.to.be.empty
  expect(found[0].id).to.equal(id)
}

const searchMls = async () => {
  const id = await save()
  const listing = await promisify(Listing.get)(id)

  const query = listing.mls_number
  const status = [ listing.status ]
  const limit = 1

  const found = await Listing.stringSearch({query, status, limit})

  expect(found).not.to.be.empty
  expect(found[0].id).to.equal(id)
}

describe('MLS Listing', () => {
  createContext()

  it('should save a listing', save)
  it('should send an email for just Sold', justSold)
  it('should get a listing', get)
  it('should get a bunch of listings', getAll)
  it('should get a bunch of compact listings', getCompacts)
  it('should get a listing by mls number', getByMLSNumber)
  it('should get a listing by matrix unique id', getByMUI)
  it('should get a listing by string search on address', searchAddress)
  it('should get a listing by string search on mls number', searchMls)
})
