const db  = require('../../../utils/db.js')
const KMS = require('../../KMS')


const encryptTokens = async (tokens) => {
  const promises = []

  promises.push(KMS.encrypt(new Buffer(tokens.access_token, 'utf-8')))
  promises.push(KMS.encrypt(new Buffer(tokens.refresh_token, 'utf-8')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

const create = async (body) => {
  const { aToken, rToken } = await encryptTokens(body.tokens)

  return db.insert('google/credential/insert',[
    body.user,
    body.brand,

    body.profile.emailAddress,
    body.profile.resourceName,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,

    body.profile.messagesTotal || null,
    body.profile.threadsTotal || null,
    body.profile.historyId || null,
  
    aToken,
    rToken,
    body.tokens.expiry_date,

    JSON.stringify(body.scope),
    JSON.stringify(body.scopeSummary)
  ])
}


module.exports = {
  create
}