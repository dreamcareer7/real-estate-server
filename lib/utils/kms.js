const KMS = require('../models/KMS')


const decryptTokens = async (aToken, rToken) => {
  const promises = []

  promises.push(KMS.decrypt(Buffer.from(aToken, 'base64')))
  promises.push(KMS.decrypt(Buffer.from(rToken, 'base64')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

const encryptTokens = async (tokens) => {
  const promises = []

  promises.push(KMS.encrypt(Buffer.from(tokens.access_token, 'utf-8')))
  promises.push(KMS.encrypt(Buffer.from(tokens.refresh_token, 'utf-8')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

module.exports = {
  decryptTokens,
  encryptTokens,
  encrypt: KMS.encrypt,
  decrypt: KMS.decrypt
}
