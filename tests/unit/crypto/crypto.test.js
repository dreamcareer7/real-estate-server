const { expect } = require('chai')
const { createContext } = require('../helper')

const string = 'some random string'

const encrypt = async () => {
  const encrypted = Crypto.encrypt(string)

  return encrypted
}

const decrypt = async () => {
  const encrypted = await encrypt()

  const decrypted = Crypto.decrypt(encrypted)

  expect(decrypted).to.equal(string)
}

const sign = async () => {
  Crypto.sign(string)
}

describe('Crypto', () => {
  createContext()

  it('encrypt something', encrypt)
  it('decrypt something', decrypt)
  it('sign    something', sign)
})
