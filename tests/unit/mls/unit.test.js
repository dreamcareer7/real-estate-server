const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/unit')

const saveUnit = async () => {
  const id = await PropertyUnit.create(json)
  expect(id).to.be.a('string')
}

describe('MLS Unit', () => {
  createContext()

  it('should save a unit', saveUnit)
})
