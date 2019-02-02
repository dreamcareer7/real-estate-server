const { expect } = require('chai')
const { createContext } = require('../helper')

const promisify = require('../../../lib/utils/promisify')

const { Listing } = require('../../../lib/models/Listing')

const json = require('./json/listing.json')
const property = require('./json/property.json')
const address = require('./json/address.json')

const save = async () => {
  const saved = await promisify(Listing.create)({
    listing: json,
    property,
    address,
    revision: 1
  })

  return saved.listing.id
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
  const listing = await Listing.getByMLSNumber(json.mls_number)

  expect(listing.id).to.equal(id)
}

const getByMUI = async () => {
  const id = await save()
  const listing = await Listing.getByMUI(json.matrix_unique_id)

  expect(listing.id).to.equal(id)
}

const search = async () => {
  const id = await save()
  const listing = await promisify(Listing.get)(id)

  const query = listing.property.address.street_address
  const status = [ listing.status ]
  const limit = 1

  const found = await Listing.stringSearch({query, status, limit})

  expect(found).not.to.be.empty
  expect(found[0].id).to.equal(id)
}

describe('MLS Listing', () => {
  createContext()

  it('should save a listing', save)
  it('should get a listing', get)
  it('should get a bunch of listings', getAll)
  it('should get a bunch of compact listings', getCompacts)
  it('should get a listing by mls number', getByMLSNumber)
  it('should get a listing by matrix unique id', getByMUI)
  it('should get a listing by string search', search)
})
