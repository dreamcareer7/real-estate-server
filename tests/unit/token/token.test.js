const { expect } = require('chai')

const { createContext } = require('../helper')
const config = require('../../../lib/config')

const create = async () => {
  const user = await User.getByEmail(config.tests.username)

  const token_type = 'access'

  const token = await Token.create({
    client_id: config.tests.client_id,
    user: user.id,
    token_type,
    expires_at: new Date
  })

  expect(token.token_type).to.equal(token_type)
  expect(token.client).to.equal(config.tests.client_id)
  expect(token.user).to.equal(user.id)

  return token
}

const get = async () => {
  const token = await create()

  const got = await Token.get(token.token)

  expect(token).to.deep.equal(got)
}

describe('Client', () => {
  createContext()

  it('create a token', create)
  it('get a token', get)
})
