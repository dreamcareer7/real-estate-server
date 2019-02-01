const { expect } = require('chai')

const { createContext } = require('../helper')
const AddressHelper = require('./helpers/address')

const json = require('./json/property')

const save = async () => {
  const address = await AddressHelper.create()

  const saved = await Property.create(json)
  expect(saved).to.be.a('string')

  return saved
}

const get = async () => {
  const saved = await save()
  const fetched = await Address.get(saved)

  expect(fetched.id).to.equal(saved)
}


describe('MLS Address', () => {
  createContext()

  it('should save an address', save)
//   it('should get an address', get)
})
