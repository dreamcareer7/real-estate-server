const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleCredential = {}

/**
 * @param {UUID[]} ids
 * @returns {Promise<IGoogleCredential[]>}
 */
GoogleCredential.getAll = async (ids) => {
  return await db.select('google/credential/get', [ids])
}

/**
 * @param {UUID} id
 */
GoogleCredential.get = async (id) => {
  const credentials = await GoogleCredential.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Google-Credential ${id} not found`)

  return credentials[0]
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
GoogleCredential.getByUser = async (user, brand) => {
  const ids = await GoogleCredential.findByUser(user, brand)

  if (ids.length < 1)
    return []

  return await GoogleCredential.getAll(ids)
}

/**
 * @param {UUID} user
 * @param {UUID} brand
 */
GoogleCredential.findByUser = (user, brand) => {
  return db.selectIds('google/credential/get_by_user', [user, brand])
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

    JSON.stringify(body.scope),
    JSON.stringify(body.scopeSummary)
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

GoogleCredential.updateLastSync = async (id, duration) => {
  await db.select('google/credential/update_last_sync', [
    id,
    duration,
    new Date()
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
  const credential = await GoogleCredential.get(id)

  if ( credential.deleted_at )
    throw Error.BadRequest('Google-Credential is deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Google-Account is revoked!')

  if ( credential.last_sync_at === null && credential.sync_status === null )
    throw Error.BadRequest('Please wait until current sync job is finished.')

  if ( credential.sync_status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job is finished.')

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
    syncToken
  ])
}

GoogleCredential.updateRechatGoogleCalendar = async (id, rechatGoogleCalendar) => {
  return db.update('google/credential/update_rechat_gcalendar', [
    id,
    rechatGoogleCalendar
  ])
}

GoogleCredential.updateCalendarsLastSyncAt = async (id) => {
  return db.update('google/credential/update_calendars_last_sync_at', [id])
}

GoogleCredential.hasSendEmailAccess = async (id) => {
  const credential = await GoogleCredential.get(id)

  if ( credential.scope_summary.includes('mail.send') )
    return credential

  throw Error.BadRequest('Access is denied! Insufficient Permission! Reconnect Your Account.')
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
