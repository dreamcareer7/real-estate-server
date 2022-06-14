const { expect } = require('chai')
const sinon = require('sinon')
const { stub } = sinon
const proxyquire = require('proxyquire')
const { createContext } = require('../helper')
const sql = require('../../../lib/utils/sql')
const OpenHouse = {
  ...require('../../../lib/models/OpenHouse/get'),
}

const promisify = require('../../../lib/utils/promisify')
const property = require('./json/property.json')
const address = require('./json/address.json')

const { Listing } = require('../../../lib/models/Listing')

const json = require('./json/openhouse')
const listingJson = require('./json/listing.json')

const redis = { zadd: stub()}
const promisifyS = stub().callsFake(() => {
  return redis.zadd
})

const { create: createOpenHouse } = proxyquire('../../../lib/models/OpenHouse/Create', {
  '../../utils/promisify': promisifyS
})

sinon.stub(createOpenHouse)

const save = async () => {
  const id = await createOpenHouse(json)
  expect(id).to.be.a('string')

  return id
}

const saveAndSendNotification = async () => {
  const matrix_unique_id = 66666666

  await promisify(Listing.create)({
    listing: { 
      ...listingJson,
      matrix_unique_id: matrix_unique_id,
      mls: json.mls
    },
    property,
    address,
    revision: 1
  })

  const id = await createOpenHouse({
    ...json,
    listing_mui: matrix_unique_id,
    matrix_unique_id: 7777,
    start_time: new Date(new Date().getTime() + 1000000).toISOString()
  })

  expect(redis.zadd.callCount).to.equal(2)
  return id
}

const get = async () => {
  const id = await save()

  const openhouse = await OpenHouse.get(id)

  expect(openhouse.id).to.equal(id)
}

describe('MLS Open House', () => {
  createContext()

  it('should save an open house', save)
  it('should save an open house and send notification', saveAndSendNotification)
  it('should save an open house', get)
})
