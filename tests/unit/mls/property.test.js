const { expect } = require('chai')

const { createContext } = require('../helper')
const AddressHelper = require('./helpers/address')

const json = require('./json/property')

const save = async () => {
  const address = await AddressHelper.create()

  const saved = await Property.create({
    ...json,
    address_id: address.id
  })

  expect(saved).to.be.a('string')

  return saved
}

describe('MLS Property', () => {
  createContext()

  it('should save a property', save)
})
