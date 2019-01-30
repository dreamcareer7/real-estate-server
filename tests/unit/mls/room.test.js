const { expect } = require('chai')

const { createContext } = require('../helper')

const json = require('./room.json')

const saveRoom = async () => {
  const id = await PropertyRoom.create(json)
  expect(id).to.be.a('string')
}

describe('MLS Room', () => {
  createContext()

  it('should save a room', saveRoom)
})
