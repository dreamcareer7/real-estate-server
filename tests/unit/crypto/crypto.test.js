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
  const signed = Crypto.sign(string)
  return signed
}

const verify = async () => {
  const signature = await sign()
  const verified = Crypto.verify(string, signature)

  expect(verified).to.be.true

  const failed = Crypto.verify(string, signature + ' ')

  expect(failed).to.be.false
}

describe('Crypto', () => {
  createContext()

  it('encrypt something', encrypt)
  it('decrypt something', decrypt)
  it('sign    something', sign)
  it('verify  something', verify)
})
