const db = require('../../../utils/db.js')

const { getAll } = require('./getAll')
const { decryptTokens } = require('../../../utils/kms')


/**
 * @returns {Promise<IMicrosoftCredential[]>}
 */
const getAllWithKeys = async (ids) => {
  const credentials =  await getAll(ids)

  for (const credential of credentials) {
    const { aToken, rToken } = await decryptTokens(credential.access_token, credential.refresh_token)

    credential.access_token  = aToken
    credential.refresh_token = rToken
  }

  return credentials
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const credentials = await getAllWithKeys([id])

  if (credentials.length < 1) {
    throw Error.ResourceNotFound(`Microsoft-Credential ${id} not found`)
  }

  return credentials[0]
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const findByUserBrand = (user, brand) => {
  return db.selectIds('microsoft/credential/get_by_user', [user, brand])
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const getByUser = async (user, brand) => {
  const ids = await findByUserBrand(user, brand)

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}

/**
 * @param {UUID} brand
 */
const getByBrand = async (brand) => {
  const ids = await db.selectIds('microsoft/credential/get_by_brand', [brand])

  if (ids.length < 1) {
    return []
  }

  return getAll(ids)
}


module.exports = {
  get,
  findByUserBrand,
  getByUser,
  getByBrand
}