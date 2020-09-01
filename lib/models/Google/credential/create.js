const db = require('../../../utils/db.js')
const { encryptTokens } = require('../../../utils/kms')


/**
 * @param {Object} body
 */
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