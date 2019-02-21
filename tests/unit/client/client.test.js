const { expect } = require('chai')

const { createContext } = require('../helper')
const config = require('../../../lib/config')

const get = async () => {
  const client = await Client.get(config.tests.client_id)

  expect(client.id).to.equal(config.tests.client_id)
  expect(client.secret).to.equal(config.tests.client_secret)
}

const publicize = async () => {
  const client = await Client.get(config.tests.client_id)

  Client.publicize(client)

  expect(client.id).to.equal(config.tests.client_id)
  expect(client.secret).to.be.undefined
}

describe('Client', () => {
  createContext()

  it('get a client', get)
  it('publicize a client', publicize)
})
