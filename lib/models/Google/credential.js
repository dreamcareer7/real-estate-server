const db  = require('../../utils/db.js')
const Orm = require('../Orm')
const KMS = require('../KMS')
const UsersJobs = require('../UsersJob')

const GoogleCredential = {}

const encryptTokens = async (tokens) => {
  const promises = []

  promises.push(KMS.encrypt(new Buffer(tokens.access_token, 'utf-8')))
  promises.push(KMS.encrypt(new Buffer(tokens.refresh_token, 'utf-8')))

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}

const decryptTokens = async (aToken, rToken) => {
  const promises = []

  promises.push(KMS.decrypt(new Buffer(aToken, 'base64')))
  promises.push(KMS.decrypt(new Buffer(rToken, 'base64')))  

  const result = await Promise.all(promises)

  return {
    aToken: result[0],
    rToken: result[1]
  }
}


/**
 * @param {UUID[]} ids
 * @returns {Promise<IGoogleCredential[]>}
 */
GoogleCredential.getAll = async (ids) => {
  const credentials = await db.select('google/credential/get', [ids])

  for (const credential of credentials) {
    const { aToken, rToken } = await decryptTokens(credential.access_token, credential.refresh_token)

    credential.access_token  = aToken
    credential.refresh_token = rToken
  }

  return credentials
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
 * @param {String} email
 */
GoogleCredential.getByEmail = async (email) => {
  const ids = await db.selectIds('google/credential/get_by_email', [email])

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
  delete model.watcher_exp

  return model
}

GoogleCredential.create = async (body) => {
  const { aToken, rToken } = await encryptTokens(body.tokens)

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
  
    aToken,
    rToken,
    body.tokens.expiry_date,

    JSON.stringify(body.scope),
    JSON.stringify(body.scopeSummary)
  ])
}

/**
 * @param {UUID} id
 * @param {Object} tokens
 */
GoogleCredential.updateTokens = async (id, tokens) => {
  const { aToken, rToken } = await encryptTokens(tokens)

  return db.update('google/credential/update_tokens', [
    aToken,
    rToken,
    Number(tokens.expiry_date),
    id
  ])
}

/**
 * @param {UUID} id
 * @param {String} refreshToken
 */
GoogleCredential.updateRefreshToken = async (id, refreshToken) => {
  const rToken = await KMS.encrypt(new Buffer(refreshToken, 'utf-8'))

  return db.update('google/credential/update_refresh_token', [
    id,
    rToken
  ])
}

/**
 * @param {UUID} id
 * @param {String} accessToken
 * @param {Number} expiryDate
 */
GoogleCredential.updateAccesshToken = async (id, accessToken, expiryDate) => {
  const aToken = await KMS.encrypt(new Buffer(accessToken, 'utf-8'))

  return db.update('google/credential/update_access_token', [
    id,
    aToken,
    Number(expiryDate)
  ])
}

/**
 * @param {UUID} id
 */
GoogleCredential.updateAsRevoked = async (id) => {
  return db.update('google/credential/revoked', [id])
}

/**
 * @param {UUID} id
 * @param {Number} duration
 */
GoogleCredential.updateLastSync = async (id, duration) => {
  await db.select('google/credential/update_last_sync', [
    id,
    duration,
    new Date()
  ])
}

/**
 * @param {UUID} id
 * @param {String} status
 */
GoogleCredential.updateSyncStatus = async (id, status) => {
  return await db.select('google/credential/update_last_sync_status', [
    id,
    status
  ])
}

/**
 * @param {UUID} id
 */
GoogleCredential.postponeSync = async (id) => {
  await db.select('google/credential/postpone_sync', [id])
}

/**
 * @param {UUID} id
 * @param {String} action
 */
GoogleCredential.disableEnableSync = async (id, action) => {
  let deleted_at = null

  if ( action === 'disable' ) {
    deleted_at = new Date()
  }

  return db.update('google/credential/diable_enable_sync', [id, deleted_at])
}

/**
 * @param {UUID} id
 */
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

  return db.update('google/credential/gmail_force_sync', [id])
}

/**
 * @param {UUID} id
 */
GoogleCredential.forceSyncCalendar = async (id) => {
  const credential = await GoogleCredential.get(id)

  if ( credential.deleted_at )
    throw Error.BadRequest('Google-Credential is deleted!')

  if ( credential.revoked )
    throw Error.BadRequest('Google-Account is revoked!')

  if ( !credential.google_calendar )
    throw Error.BadRequest('No Rechat Special Calendar!')

  if ( credential.calendars_last_sync_at === null )
    throw Error.BadRequest('Please wait until current sync job is finished.')

  const job = await UsersJobs.getByGoogleCredential(credential.id, 'calendar')

  if ( job.status === 'pending' )
    throw Error.BadRequest('Please wait until current sync job is finished.')

  return db.update('google/credential/cal_force_sync', [id])
}

/**
 * @param {UUID} id
 * @param {Object} profile
 */
GoogleCredential.updateProfile = async (id, profile) => {
  return db.update('google/credential/update_profile', [
    profile.displayName || null,
    profile.firstName || null,
    profile.lastName || null,
    profile.photo || null,
    id
  ])
}

/**
 * @param {UUID} id
 * @param {Object} profile
 */
GoogleCredential.updateGmailProfile = async (id, profile) => {
  return db.update('google/credential/update_gmail_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    profile.historyId,
    id
  ])
}

/**
 * @param {UUID} id
 */
GoogleCredential.updateContactsLastSyncAt = async (id) => {
  return db.update('google/credential/update_contacts_last_sync_at', [
    id,
    new Date()
  ])
}

/**
 * @param {UUID} id
 * @param {Number} historyId
 * @param {Number?} watcherExp
 */
GoogleCredential.updateMessagesSyncHistoryId = async (id, historyId, watcherExp = null) => {
  return db.update('google/credential/update_messages_sync_history_id', [
    id,
    historyId,
    watcherExp
  ])
}

/**
 * @param {UUID} id
 * @param {UUID} rechatGoogleCalendar
 */
GoogleCredential.updateRechatGoogleCalendar = async (id, rechatGoogleCalendar) => {
  return db.update('google/credential/update_rechat_gcalendar', [
    id,
    rechatGoogleCalendar
  ])
}

/**
 * @param {UUID} id
 * @param {Date} ts
 */
GoogleCredential.updateCalendarsLastSyncAt = async (id, ts = new Date()) => {
  return db.update('google/credential/update_calendars_last_sync_at', [id, new Date(ts)])
}

/**
 * @param {UUID} id
 */
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