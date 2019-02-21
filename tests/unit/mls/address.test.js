const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/address')

const save = async () => {
  const id = await Address.create(json)
  expect(id).to.be.a('string')

  return id
}

const get = async () => {
  const saved = await save()
  const fetched = await Address.get(saved)

  expect(fetched.id).to.equal(saved)
}


describe('MLS Address', () => {
  createContext()

  it('should save an address', save)
  it('should get an address', get)
})
