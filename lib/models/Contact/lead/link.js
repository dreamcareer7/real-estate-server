const b64 = require('base64url').default
const Crypto = require('../../Crypto')
const Url = require('../../Url')

/**
 * @param {import("./types").ILtsLeadUrlMetadata} metadata 
 */
function createLink(metadata) {
  const encrypted = Crypto.encrypt(JSON.stringify(metadata))
  return b64.encode(encrypted)
}

/**
 * @param {import('./types').ILtsLeadUrlMetadata} param0 
 * @returns {string}
 */
function generateLtsLink({
  brand,
  user,
  protocol = 'LeadTransmissionStandard',
  mls = [],
  source,
}) {
  const encrypted = createLink({ brand, user, protocol, mls, source })

  return Url.api({ uri: '/contacts/leads/' + encrypted })
}

/**
 * @param {string} key 
 * @returns {import('./types').ILtsLeadUrlMetadata}
 */
function decodeLtsLink(key) {
  const decrypted = Crypto.decrypt(b64.decode(key))
  return JSON.parse(decrypted)
}

module.exports = {
  createLink,
  generateLtsLink,
  decodeLtsLink,
}
