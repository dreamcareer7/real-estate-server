const b64 = require('base64url').default

const { expect } = require('chai')
const Crypto = require('../../Crypto')

/**
 * Returns an encrypted token based on a few showing details
 * @param {import('./types').Showing} showing
 */
function encodeToken(showing) {
  return b64.encode(Crypto.encrypt(showing.id))
}

/**
 * Returns an encrypted token based on a few showing details
 * @param {string} token
 * @returns {UUID}
 */
function decodeToken(token) {
  const showing_id = Crypto.decrypt(b64.decode(token))
  try {
    expect(showing_id).to.be.uuid
  } catch {
    throw Error.ResourceNotFound('Invalid showing token!')
  }

  return showing_id
}

module.exports = {
  encodeToken,
  decodeToken,
}
