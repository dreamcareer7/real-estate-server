const db  = require('../../../utils/db.js')


const getAll = async (ids) => {
  return await db.select('microsoft/subscription/get', [ids])
}

const get = async (id) => {
  const subscriptions = await getAll([id])

  if (subscriptions.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Subscription ${id} not found`)

  return subscriptions[0]
}

const getByRemoteId = async (remote_id) => {
  const result = await db.selectIds('microsoft/subscription/get_by_remote_id', [remote_id])

  if ( result.length === 0 ) {
    return null
  }

  return await get(result[0])
}

const getByResource = async (credential_id, resource) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_resource', [credential_id, resource])

  if (ids.length < 1)
    return null

  return await get(ids[0])
}

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