const b64 = require('base64url').default
const Crypto = require('../../Crypto')

/**
 * @param {import("./types").ILtsLeadUrlMetadata} metadata 
 */
async function createLink(metadata) {
  const encrypted = Crypto.encrypt(JSON.stringify(metadata))
  return b64.encode(encrypted)
}

module.exports = {
  createLink,
}
