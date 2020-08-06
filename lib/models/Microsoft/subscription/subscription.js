const db  = require('../../../utils/db.js')

const getClient = require('../client')



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

const create = async (body) => {
  return db.insert('microsoft/subscription/insert',[
    body.microsoft_credential,
    body.subscription_id,
    body.resource,
    body.change_type,
    body.client_state,
    body.notification_url,
    body.expiration_date_time,
    body.creator_id,
    body.application_id
  ])
}

const deleteById = async (id) => {
  return await deleteMany([id])
}

const deleteMany = async (ids) => {
  return db.select('microsoft/subscription/delete',[ids])
}

const updateExpirationDateTime = async (id, time) => {
  return db.update('microsoft/subscription/update_expiration_time', [
    id,
    time
  ])
}

const stop = async (credential_id) => {
  const microsoft     = await getClient(credential_id, 'outlook')
  const subscriptions = await getByCredential(credential_id)

  const subIds = subscriptions.map(sub => sub.subscription_id)
  const ids    = subscriptions.map(sub => sub.id)

  await microsoft.batchDeleteSubscription(subIds)
  await deleteMany(ids)

  return
}


module.exports = {
  getAll,
  get,
  getByRemoteId,
  getByResource,
  getByCredential,
  create,
  delete: deleteById,
  deleteMany,
  updateExpirationDateTime,
  stop
}