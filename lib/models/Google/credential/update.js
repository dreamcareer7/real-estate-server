const db = require('../../../utils/db.js')
const { encryptTokens, encrypt } = require('../../../utils/kms')
// const { Disconnect } = require('../workers')


/**
 * @param {UUID} id
 * @param {Object} tokens
 */
const updateTokens = async (id, tokens) => {
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
const updateRefreshToken = async (id, refreshToken) => {
  const rToken = await encrypt(Buffer.from(refreshToken, 'utf-8'))

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
const updateAccesshToken = async (id, accessToken, expiryDate) => {
  const aToken = await encrypt(Buffer.from(accessToken, 'utf-8'))

  return db.update('google/credential/update_access_token', [
    id,
    aToken,
    Number(expiryDate)
  ])
}

/**
 * @param {UUID} id
 */
const updateLastDailySync = async (id) => {
  await db.select('google/credential/update_last_daily_sync', [id])
}

/**
 * @param {UUID} id
 */
const disconnect = async (id) => {
  await db.update('google/credential/disconnect', [id, new Date()])
  // Disconnect.credential({ id })
}

/**
 * @param {UUID} id
 */
const revoke = async (id) => {
  return db.update('google/credential/revoke', [id])
}

/**
 * @param {UUID} id
 * @param {Object} profile
 */
const updateProfile = async (id, profile) => {
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
const updateGmailProfile = async (id, profile) => {
  return db.update('google/credential/update_gmail_profile', [
    profile.messagesTotal,
    profile.threadsTotal,
    profile.historyId,
    id
  ])
}

/**
 * @param {UUID} id
 * @param {Number?} historyId
 * @param {Number?} watcherExp
 */
const updateMessagesSyncHistoryId = async (id, historyId, watcherExp = null) => {
  return db.update('google/credential/update_messages_sync_history_id', [
    id,
    historyId,
    watcherExp
  ])
}

/**
 * @param {UUID} id
 * @param {String} SyncToken
 */
const updateContactGroupsSyncToken = async (id, SyncToken) => {
  return db.update('google/credential/update_contact_groups_sync_token', [ id, SyncToken ])
}

/**
 * @param {UUID} id
 * @param {String} SyncToken
 */
const updateContactsSyncToken = async (id, SyncToken) => {
  return db.update('google/credential/update_contacts_sync_token', [ id, SyncToken ])
}

/**
 * @param {UUID} id
 * @param {UUID?} calendarId rechatGoogleCalendar
 */
const updateRechatGoogleCalendar = async (id, calendarId) => {
  return db.update('google/credential/update_rechat_gcalendar', [id, calendarId])
}

/**
 * @param {UUID} id
 */
const resetRechatGoogleCalendar = async (id) => {
  return updateRechatGoogleCalendar(id, null)
}


module.exports = {
  updateTokens,
  updateRefreshToken,
  updateAccesshToken,
  updateLastDailySync,
  disconnect,
  revoke,
  updateProfile,
  updateGmailProfile,
  updateMessagesSyncHistoryId,
  updateContactGroupsSyncToken,
  updateRechatGoogleCalendar,
  updateContactsSyncToken,
  resetRechatGoogleCalendar
}