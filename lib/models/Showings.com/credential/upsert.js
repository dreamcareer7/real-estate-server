const db  = require('../../../utils/db.js')
const Crypto = require('../../Crypto')

const credentialValidator = require('../credential_validator')


const create = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  if ( !credentialValidator(body.selected_location, body.selected_location_string) )
    throw Error.BadRequest('selected_location inputs are not valid!')

  return db.insert('showings.com/credential/insert',[
    user,
    brand,
    encryptedUsername,
    encryptedPassword,
    body.selected_location,
    body.selected_location_string,
    body.loginStatus || false
  ])
}

const updateCredential = async (user, brand, body) => {
  const encryptedUsername = await Crypto.encrypt(body.username)
  const encryptedPassword = await Crypto.encrypt(body.password)

  if ( !credentialValidator(body.selected_location, body.selected_location_string) )
    throw Error.BadRequest('selected_location inputs are not valid!')

  return db.update('showings.com/credential/update', [
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

  return db.update('showings.com/credential/update_market', [
    body.selected_location,
    body.selected_location_string,
    user,
    brand
  ])
}

const updateCredentialLoginStatus = async (user, brand, loginStatus) => {
  return db.update('showings.com/credential/update_loging_status', [
    user,
    brand,
    loginStatus
  ])
}

const deleteByUserBrand = async (user, brand) => {
  await db.query.promise('showings.com/credential/delete', [user, brand])
}

const updateLastCrawledDate = async (showingsCredentialId, lastCrawledTS) => {
  await db.update('showings.com/credential/last_crawled', [
    new Date(lastCrawledTS),
    showingsCredentialId
  ])
}


module.exports = {
  create,
  updateCredential,
  updateMarket,
  updateCredentialLoginStatus,
  delete: deleteByUserBrand,
  updateLastCrawledDate,
}
