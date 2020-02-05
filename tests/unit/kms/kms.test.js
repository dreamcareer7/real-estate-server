const { expect } = require('chai')
const KMS = require('../../../lib/models/KMS')


async function test() {
  const Plaintext = 'text-to-decrypt-and-encrypt'

  const encrypted = await KMS.encrypt(Plaintext)
  expect(encrypted).to.be.equal(new Buffer(Plaintext).toString('base64'))

  const decrypted = await KMS.decrypt(encrypted)
  expect(decrypted).to.be.equal(Plaintext)
}


describe('AWS KMS', () => {
  describe('AWS KMS Encrypt and Decrypt', () => {
    it('should encrypt and decrypt a sample text', test)
  })
})