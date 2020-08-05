const db = require('../../../utils/db.js')
const { encryptTokens } = require('../../../utils/kms')


const create = async (body) => {
  const { aToken, rToken } = await encryptTokens(body.tokens)

  return db.insert('microsoft/credential/insert',[
    body.user,
    body.brand,
    body.profile.email,
    body.profile.remote_id,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,
    aToken,
    rToken,
    body.tokens.id_token,
    (new Date().getTime() + (body.tokens.expires_in * 1000)),
    (new Date().getTime() + (body.tokens.ext_expires_in * 1000)),
    JSON.stringify(body.scope),
    JSON.stringify(body.scopeSummary)
  ])
}

module.exports = {
  create
}