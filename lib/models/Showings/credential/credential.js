const db  = require('../../../utils/db.js')
const Crypto = require('../../Crypto')

const credentialValidator = require('../credential_validator')


const create = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  if ( !credentialValidator(body.selected_location, body.selected_location_string) )
    throw Error.BadRequest('selected_location inputs are not valid!')

  return db.insert('showing/credential/insert',[
    user,
    brand,
    encryptedUsername,
    encryptedPassword,
    body.selected_location,
    body.selected_location_string,
    body.loginStatus || false
  ])
}

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
  const showingsCredentials = await db.select('showing/credential/get', [credential_ids])

  return showingsCredentials
}

const getByUser = async (user, brand) => {
  const ids = await db.selectIds('showing/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`ShowingsCredential by user ${user} and brand ${brand} not found`)

  return get(ids[0])
}

const updateCredential = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  if ( !credentialValidator(body.selected_location, body.selected_location_string) )
    throw Error.BadRequest('selected_location inputs are not valid!')

  return db.update('showing/credential/update', [
    encryptedUsername,
    encryptedPassword,
    body.selected_location,
    body.selected_location_string,
    user,
    brand
  ])
}

const updateMarket = async (user, brand, body) => {
  if ( !credentialValidator(body.selected_location, body.selected_location_string) )
    throw Error.BadRequest('selected_location inputs are not valid!')

  return db.update('showing/credential/update_market', [
    body.selected_location,
    body.selected_location_string,
    user,
    brand
  ])
}

const updateCredentialLoginStatus = async (user, brand, loginStatus) => {
  return db.update('showing/credential/update_loging_status', [
    user,
    brand,
    loginStatus
  ])
}

const deleteByUserBrand = async (user, brand) => {
  await db.query.promise('showing/credential/delete', [user, brand])
}

const updateLastCrawledDate = async (showingsCredentialId, lastCrawledTS) => {
  await db.update('showing/credential/last_crawled', [
    new Date(lastCrawledTS),
    showingsCredentialId
  ])
}


module.exports = {
  create,
  get,
  getAll,
  getByUser,
  updateCredential,
  updateMarket,
  updateCredentialLoginStatus,
  delete: deleteByUserBrand,
  updateLastCrawledDate,
}