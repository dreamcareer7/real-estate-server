const db  = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('microsoft/subscription/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const subscriptions = await getAll([id])

  if (subscriptions.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Subscription ${id} not found`)

  return subscriptions[0]
}

/**
 * @param {String} remote_id
 */
const getByRemoteId = async (remote_id) => {
  const result = await db.selectIds('microsoft/subscription/get_by_remote_id', [remote_id])

  if ( result.length === 0 ) {
    return null
  }

  return await get(result[0])
}

/**
 * @param {UUID} credential_id
 * @param {String} resource
 */
const getByResource = async (credential_id, resource) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_resource', [credential_id, resource])

  if (ids.length < 1)
    return null

  return await get(ids[0])
}

/**
 * @param {UUID} credential_id
 */
const getByCredential = async (credential_id) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_credential', [credential_id])

  if (ids.length < 1)
    return []

  return await getAll(ids)
}


module.exports = {
  getAll,
  get,
  getByRemoteId,
  getByResource,
  getByCredential
}