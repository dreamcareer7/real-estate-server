const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/openhouse')

const save = async () => {
  const id = await OpenHouse.create(json)
  expect(id).to.be.a('string')

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
  it('should save an open house', get)
})
