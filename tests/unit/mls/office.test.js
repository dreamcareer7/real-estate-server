const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./json/office')

const saveOffice = async () => {
  const id = await Office.create(json)
  expect(id).to.be.a('string')

  return id
}

const getOffices = async () => {
  const saved = await saveOffice()

  const fetched = await Office.getAll([saved])

  expect(fetched[0].id).to.equal(saved)
}

const getByMLSNumber = async () => {
  const saved = await saveOffice()

  const fetched = await Office.getByMLS(json.mls_id)

  expect(fetched.id).to.equal(saved)
}

const search = async () => {
  const saved = await saveOffice()

  const fetched = await Office.search(json.name)

  expect(fetched[0].id).to.equal(saved)
}

describe('MLS Office', () => {
  createContext()

  it('should save an office', saveOffice)
  it('should fetch a list of offices', getOffices)
  it('should get an office by mls number', getByMLSNumber)
  it('should get an office by string search', search)
})
