const db  = require('../../../utils/db.js')

const getClient = require('../client')
const { getByCredential } = require('./get')


/**
 * @param {Object} body
 */
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

/**
 * @param {UUID} id
 */
const deleteById = async (id) => {
  return await deleteMany([id])
}

/**
 * @param {UUID[]} ids
 */
const deleteMany = async (ids) => {
  return db.select('microsoft/subscription/delete',[ids])
}

/**
 * @param {UUID} id
 * @param {Strin} time
 */
const updateExpirationDateTime = async (id, time) => {
  return db.update('microsoft/subscription/update_expiration_time', [
    id,
    time
  ])
}

/**
 * @param {UUID} credential_id
 */
const stop = async (credential_id) => {
  const microsoft     = await getClient(credential_id, 'outlook')
  const subscriptions = await getByCredential(credential_id)

  const subIds = subscriptions.map(sub => sub.subscription_id)
  const ids    = subscriptions.map(sub => sub.id)

  await microsoft.batchDeleteSubscription(subIds)
  await deleteMany(ids)
}


module.exports = {
  create,
  delete: deleteById,
  deleteMany,
  updateExpirationDateTime,
  stop
}