const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleCredential = {}


GoogleCredential.getAll = async (ids) => {
  return await db.select('google/credential/get', [ids])
}

GoogleCredential.get = async (id) => {
  const credentials = await GoogleCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${id} not found`)

  return credentials[0]
}

GoogleCredential.getByUser = async (user, brand) => {
  const ids = await db.selectIds('google/credential/get_by_user', [user, brand])

  if (ids.length < 1)
    return []

  return await GoogleCredential.getAll(ids)
}

GoogleCredential.publicize = async model => {
  delete model.access_token
  delete model.refresh_token
  delete model.expiry_date
  delete model.contacts_sync_token
  delete model.contact_groups_sync_token
  delete model.messages_sync_history_id
  delete model.threads_sync_history_id

  return model
}

GoogleCredential.create = async (body) => {
  return db.insert('google/credential/insert',[
    body.user,
    body.brand,

    body.profile.emailAddress,
    body.profile.resourceName,
    body.profile.displayName || null,
    body.profile.firstName || null,
    body.profile.lastName || null,
    body.profile.photo || null,

    body.profile.messagesTotal || null,
    body.profile.threadsTotal || null,
    body.profile.historyId || null,
  
    body.tokens.access_token,
    body.tokens.refresh_token,
    body.tokens.expiry_date,

    JSON.stringify(body.scope)
  ])
}

GoogleCredential.updateTokens = async (id, tokens) => {
  return db.update('google/credential/update_tokens', [
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date,
    id
  ])
}

GoogleCredential.updateRefreshToken = async (id, refreshToken) => {
  return db.update('google/credential/update_refresh_token', [
    id,
    refreshToken,
    new Date()
  ])
}

GoogleCredential.updateAccesshToken = async (id, accessToken) => {
  return db.update('google/credential/update_access_token', [
    id,
    accessToken,
    new Date()
  ])
}

GoogleCredential.updateAsRevoked = async (id) => {
  return db.update('google/credential/revoked', [id])
}

GoogleCredential.updateLastSync = async (id, ts, duration) => {
  await db.select('google/credential/update_last_sync', [
    new Date(ts),
    duration,
    id
  ])
}

GoogleCredential.updateSyncStatus = async (id, status) => {
  return await db.select('google/credential/update_last_sync_status', [
    id,
    status
  ])
}

GoogleCredential.postponeSync = async (id) => {
  await db.select('google/credential/postpone_sync', [id])
}

GoogleCredential.disableEnableSync = async (id, action) => {
  let deleted_at = null

  if ( action === 'disable' )
    deleted_at = new Date()

  return db.update('google/credential/diable_enable_sync', [id, deleted_at])
}

GoogleCredential.forceSync = async (id) => {
  return db.update('google/credential/force_sync', [id])
}

GoogleCredential.updateProfile = async (id, profile) => {
  return db.update('google/credential/update_profile', [
    profile.displayName || null,
    profile.firstName || null,
    profile.lastName || null,
    profile.photo || null,
    id
  ])
}

GoogleCredential.updateGmailProfile = async (id, profile) => {
  return db.update('google/credential/update_gmail_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    profile.historyId,
    id
  ])
}

GoogleCredential.updateContactsLastSyncAt = async (id) => {
  return db.update('google/credential/update_contacts_last_sync_at', [
    id,
    new Date()
  ])
}

GoogleCredential.updateMessagesSyncHistoryId = async (id, syncToken) => {
  return db.update('google/credential/update_messages_sync_history_id', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateThreadsSyncHistoryId = async (id, syncToken) => {
  return db.update('google/credential/update_threads_sync_history_id', [
    id,
    syncToken,
    new Date()
  ])
}

GoogleCredential.updateRechatGoogleCalendar = async (id, rechatGoogleClendar) => {
  return db.update('google/credential/update_rechat_gcalendar', [
    id,
    rechatGoogleClendar
  ])
}


GoogleCredential.associations = {
  histories: {
    collection: true,
    enabled: false,
    model: 'GoogleSyncHistory'
  }
}

Orm.register('google_credential', 'GoogleCredential', GoogleCredential)

module.exports = GoogleCredential