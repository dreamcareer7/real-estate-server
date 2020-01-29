const config = require('../../config')
const db     = require('../../utils/db.js')
const Orm    = require('../Orm')

const MicrosoftCredential  = require('./credential')
const { getMGraphClient }  = require('./plugin/client.js')

const SCOPE_OUTLOOK_READ = config.microsoft_scopes.mail.read[0]


const MicrosoftSubscription = {}


const getMicrosoftClient = async (credential) => {
  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_READ))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

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

MicrosoftSubscription.getByRemoteId = async (remote_id) => {
  const id = await db.selectId('microsoft/subscription/get_by_remote_id', [remote_id])

  if (!id)
    throw Error.ResourceNotFound(`Microsoft-Subscription ${remote_id} not found`)

  return await MicrosoftSubscription.get(id)
}

MicrosoftSubscription.getByResource = async (credential_id, resource) => {
  const ids = await db.selectIds('microsoft/subscription/get_by_resource', [credential_id, resource])

  if (ids.length < 1)
    return null

  return await MicrosoftSubscription.get(ids[0])
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
  return db.select('microsoft/subscription/delete',[id])
}

MicrosoftSubscription.updateExpirationDateTime = async (id, time) => {
  return db.update('microsoft/subscription/update_expiration_time', [
    id,
    time
  ])
}

MicrosoftSubscription.stop = async (credential_id) => {
  const credential   = await MicrosoftCredential.get(credential_id)
  const subscription = await MicrosoftSubscription.getByResource(credential.id, '/me/messages')

  if (subscription) {
    const microsoft = await getMicrosoftClient(credential)

    await MicrosoftSubscription.delete(subscription.id)
    await microsoft.deleteSubscription(subscription.subscription_id)
  }

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