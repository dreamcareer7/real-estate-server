const db  = require('../../utils/db.js')
const Orm = require('../Orm/registry')

const getClient = require('./client')

const MicrosoftSubscription = {}



MicrosoftSubscription.getAll = async (ids) => {
  return await db.select('microsoft/subscription/get', [ids])
}

MicrosoftSubscription.get = async (id) => {
  const subscriptions = await MicrosoftSubscription.getAll([id])

  if (subscriptions.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Subscription ${id} not found`)

  return subscriptions[0]
}

MicrosoftSubscription.getByRemoteId = async (remote_id) => {
  const result = await db.selectIds('microsoft/subscription/get_by_remote_id', [remote_id])

  if ( result.length === 0 ) {
    return null
  }

  return await MicrosoftSubscription.get(result[0])
}

MicrosoftSubscription.getByResource = async (credential_id, resource) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_resource', [credential_id, resource])

  if (ids.length < 1)
    return null

  return await MicrosoftSubscription.get(ids[0])
}

MicrosoftSubscription.getByCredential = async (credential_id) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_credential', [credential_id])

  if (ids.length < 1)
    return []

  return await MicrosoftSubscription.getAll(ids)
}

MicrosoftSubscription.create = async (body) => {
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

MicrosoftSubscription.delete = async (id) => {
  return await MicrosoftSubscription.deleteMany([id])
}

MicrosoftSubscription.deleteMany = async (ids) => {
  return db.select('microsoft/subscription/delete',[ids])
}

MicrosoftSubscription.updateExpirationDateTime = async (id, time) => {
  return db.update('microsoft/subscription/update_expiration_time', [
    id,
    time
  ])
}

MicrosoftSubscription.stop = async (credential_id) => {
  const microsoft     = await getClient(credential_id, 'outlook')
  const subscriptions = await MicrosoftSubscription.getByCredential(credential_id)

  const subIds = subscriptions.map(sub => sub.subscription_id)
  const ids    = subscriptions.map(sub => sub.id)

  await microsoft.batchDeleteSubscription(subIds)
  await MicrosoftSubscription.deleteMany(ids)

  return
}

MicrosoftSubscription.publicize = async model => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}


Orm.register('microsoft_subscription', 'MicrosoftSubscription', MicrosoftSubscription)

module.exports = MicrosoftSubscription
