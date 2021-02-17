const b64 = require('base64url').default
const Crypto = require('../../lib/models/Crypto')
const Url = require('../../lib/models/Url')

function generateLtsLink({
  brand,
  user,
  protocol = 'LeadTransmissionProtocol',
  mls = 'NTREIS',
  source,
}) {
  const payload = JSON.stringify({ brand, user, protocol, mls, source })
  const encrypted = Crypto.encrypt(payload)

  return Url.api({ uri: b64.encode(encrypted) })
}

function decodeLtsLink(key) {
  const decrypted = Crypto.decrypt(b64.decode(key))
  return JSON.parse(decrypted)
}

module.exports = {
  generateLtsLink,
  decodeLtsLink,
}
