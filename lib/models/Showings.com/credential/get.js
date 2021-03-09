const db  = require('../../../utils/db.js')
const Crypto = require('../../Crypto')


const get = async (showingsCredentialId) => {
  const showingsCredentials = await getAll([showingsCredentialId])

  if (showingsCredentials.length < 1)
    throw Error.ResourceNotFound(`ShowingCredential ${showingsCredentialId} not found`)

  const credentilRecord = showingsCredentials[0]

  credentilRecord.username = Crypto.decrypt(credentilRecord.username)
  credentilRecord.password = Crypto.decrypt(credentilRecord.password)

  return credentilRecord
}

const getAll = async (credential_ids) => {
  const showingsCredentials = await db.select('showings.com/credential/get', [credential_ids])

  return showingsCredentials
}

const getByUser = async (user, brand) => {
  const ids = await db.selectIds('showings.com/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by user ${user} and brand ${brand} not found`)

  return get(ids[0])
}


module.exports = {
  get,
  getAll,
  getByUser
}
