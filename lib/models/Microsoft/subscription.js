const db  = require('../../utils/db.js')
const Orm = require('../Orm')
const Context = require('../Context')

const MicrosoftCredential  = require('./credential')
const { getMGraphClient }  = require('./plugin/client.js')

const MicrosoftSubscription = {}

const SCOPE_OUTLOOK_READ = 'Mail.Read'



/**
 * @param {UUID} credential_id 
 */
const getClient = async (credential_id) => {
  const credential = await MicrosoftCredential.get(credential_id)

  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential Is Deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_READ))
    throw Error.BadRequest('Access is denied! Insufficient Permission.')

  const microsoft = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Google-Client Failed!')

  return microsoft
}



MicrosoftSubscription.getAll = async (ids) => {
  return await db.select('microsoft/subscription/get', [ids])
}

MicrosoftSubscription.get = async (id) => {
  const subscriptions = await MicrosoftSubscription.getAll([id])

  if (subscriptions.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Subscription ${id} not found`)

  return subscriptions[0]
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

MicrosoftSubscription.updateProfile = async (id, body) => {
  return db.update('microsoft/subscription/update', [
    id,
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

MicrosoftSubscription.updateExpirationDateTime = async (id, time) => {
  return db.update('microsoft/subscription/update_expiration_time', [
    id,
    time
  ])
}

MicrosoftSubscription.publicize = async model => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at

  return model
}

MicrosoftSubscription.sample = async microsoft_credential => {
  const microsoft = await getClient(microsoft_credential)


}



MicrosoftSubscription.associations = {
  histories: {
    collection: true,
    enabled: false,
    model: 'MicrosoftSyncHistory'
  }
}

Orm.register('microsoft_subscription', 'MicrosoftSubscription', MicrosoftSubscription)

module.exports = MicrosoftSubscription