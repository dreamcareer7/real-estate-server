const { expect } = require('chai')

const { createContext } = require('../../helper')

const json = require('./unit.json')

const saveUnit = async () => {
  const id = await PropertyUnit.create(json)
  console.log(id)
}

describe('MLS Unit', () => {
  createContext()

  it('should save a unit', saveUnit)
})
