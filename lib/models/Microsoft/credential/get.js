const db = require('../../../utils/db.js')
const { decryptTokens } = require('../../../utils/kms')


/**
 * @returns {Promise<IMicrosoftCredential[]>}
 */
const getAll = async (ids) => {
  const credentials =  await db.select('microsoft/credential/get', [ids])

  for (const credential of credentials) {
    const { aToken, rToken } = await decryptTokens(credential.access_token, credential.refresh_token)

    credential.access_token  = aToken
    credential.refresh_token = rToken
  }

  return credentials
}

const get = async (id) => {
  const credentials = await getAll([id])

  if (credentials.length < 1) {
    throw Error.ResourceNotFound(`Microsoft-Credential ${id} not found`)
  }

  return credentials[0]
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const findByUser = (user, brand) => {
  return db.selectIds('microsoft/credential/get_by_user', [user, brand])
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
const getByUser = async (user, brand) => {
  const ids = await findByUser(user, brand)

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID} brand
 */
const getByBrand = async (brand) => {
  const ids = await db.selectIds('microsoft/credential/get_by_brand', [brand])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}


module.exports = {
  getAll,
  get,
  findByUser,
  getByUser,
  getByBrand
}