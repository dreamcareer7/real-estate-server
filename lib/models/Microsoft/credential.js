const db  = require('../../utils/db.js')
const Orm = require('../Orm')


const MicrosoftCredential = {}

MicrosoftCredential.getAll = async (ids) => {
  return await db.select('microsoft/credential/get', [ids])
}

MicrosoftCredential.get = async (id) => {
  const credentials = await MicrosoftCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Microsoft-Credential ${id} not found`)

  return credentials[0]
}

MicrosoftCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('microsoft/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    return []

  return await MicrosoftCredential.getAll(ids)
}

MicrosoftCredential.publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.id_token
  delete model.expires_in
  delete model.ext_expires_in

  return model
}

MicrosoftCredential.create = async (body) => {
  return db.insert('microsoft/credential/insert',[
    body.user,
    body.brand,

    body.profile.email,
    body.profile.remote_id,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,

    body.tokens.access_token,
    body.tokens.refresh_token,
    body.tokens.id_token,
    (new Date().getTime() + body.tokens.expires_in),
    (new Date().getTime() + body.tokens.ext_expires_in),
    JSON.stringify(body.tokens.scope.split(' '))
  ])
}

MicrosoftCredential.updateTokens = async (id, tokens) => {
  return db.update('microsoft/credential/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.id_token,
    (new Date().getTime() + tokens.expires_in),
    (new Date().getTime() + tokens.ext_expires_in),
    id
  ])
}

MicrosoftCredential.updateAsRevoked = async (id) => {
  return db.update('microsoft/credential/revoked', [id])
}

MicrosoftCredential.updateLastSync = async (id, ts, duration) => {
  await db.select('microsoft/credential/update_last_sync', [
    new Date(ts),
    duration,
    id
  ])
}

MicrosoftCredential.updateSyncStatus = async (id, status) => {
  return await db.select('microsoft/credential/update_last_sync_status', [
    id,
    status
  ])
}

MicrosoftCredential.disableEnableSync = async (id, action) => {
  const microsoftCredential = await MicrosoftCredential.get(id)

  if (!microsoftCredential)
    throw Error.BadRequest('You have not any connected account!')

  if (microsoftCredential.revoked)
    return true

  let deleted_at = null

  if ( action === 'disable' ) {
    if (microsoftCredential.deleted_at)
      return true

    deleted_at = new Date()
  }

  if ( action === 'enable' ) {
    if (!microsoftCredential.deleted_at)
      return true
  }

  return db.update('microsoft/credential/diable_sync', [microsoftCredential.id, deleted_at])
}

MicrosoftCredential.forceSync = async (id) => {
  return db.update('microsoft/credential/force_sync', [id])
}

MicrosoftCredential.updateProfile = async (id, profile) => {
  return db.update('microsoft/credential/update_profile', [
    profile.displayName || null,
    profile.givenName || null,
    profile.surname || null,
    profile.photo || null,
    id
  ])
}

MicrosoftCredential.updateContactsLastSyncAt = async (id) => {
  return db.update('microsoft/credential/update_contacts_last_sync_at', [
    id,
    new Date()
  ])
}

MicrosoftCredential.updateContactsLastExtractAt = async (id) => {
  return db.update('microsoft/credential/update_contacts_last_extract_at', [
    id,
    new Date()
  ])
}

MicrosoftCredential.updateMessagesLastSyncAt = async (id) => {
  return db.update('microsoft/credential/update_messages_last_sync_at', [
    id,
    new Date()
  ])
}


MicrosoftCredential.associations = {
  histories: {
    collection: true,
    enabled: false,
    model: 'MicrosoftSyncHistory'
  }
}

Orm.register('microsoft_credential', 'MicrosoftCredential', MicrosoftCredential)

module.exports = MicrosoftCredential