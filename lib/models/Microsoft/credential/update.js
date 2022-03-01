const db = require('../../../utils/db.js')
const { encryptTokens } = require('../../../utils/kms')
// const { Disconnect } = require('..//workers')


/**
 * @param {UUID} id
 * @param {Object} tokens
 */
const updateTokens = async (id, tokens) => {
  const { aToken, rToken } = await encryptTokens(tokens)

  return db.update('microsoft/credential/update_tokens', [
    aToken,
    rToken,
    tokens.id_token,
    (new Date().getTime() + (tokens.expires_in * 1000)),
    (new Date().getTime() + (tokens.ext_expires_in * 1000)),
    id
  ])
}

/**
 * @param {UUID} id
 * @param {Number} ts
 */
const updateSendEmailAfter = async (id, ts) => {
  return await db.select('microsoft/credential/update_send_email_after', [id, ts])
}

/**
 * @param {UUID} id
 */
const disconnect = async (id) => {
  await db.update('microsoft/credential/disconnect', [id, new Date()])
  // Disconnect.credential({ id })
}

/**
 * @param {UUID} id
 */
const revoke = async (id) => {
  return db.update('microsoft/credential/revoke', [id])
}

/**
 * @param {UUID} cid
 */
const removeContactSyncToken = async (cid) => {
  return db.update('microsoft/credential/remove_contacts_sync_tokens', [cid])
}

/**
 * @param {UUID} id
 * @param {Object} profile
 */
const updateProfile = async (id, profile) => {
  return db.update('microsoft/credential/update_profile', [
    profile.displayName || null,
    profile.givenName || null,
    profile.surname || null,
    profile.photo || null,
    id
  ])
}

/**
 * @param {UUID} id
 * @param {String} email
 */
const updatePrimaryEmail = async (id, email) => {
  return db.update('microsoft/credential/update_primary_email', [id, email])
}

/**
 * @param {UUID} id
 * @param {UUID?} calendarId rechatMicrosoftCalendar
 */
const updateRechatMicrosoftCalendar = async (id, calendarId) => {
  return db.update('microsoft/credential/update_rechat_mcalendar', [id, calendarId])
}

/**
 * @param {UUID} id
 * @param {String} SyncToken
 */
const updateContactFoldersSyncToken = async (id, SyncToken) => {
  return db.update('microsoft/credential/update_contact_folders_sync_token', [id, SyncToken])
}

/**
 * @param {UUID} id
 * @param {String} SyncToken
 */
const updateContactsSyncToken = async (id, SyncToken) => {
  return db.update('microsoft/credential/update_contacts_sync_token', [id, SyncToken])
}

/**
 * @param {UUID} id
 */
const resetRechatMicrosoftCalendar = async (id) => {
  return updateRechatMicrosoftCalendar(id, null)
}


module.exports = {
  updateTokens,
  updateSendEmailAfter,
  disconnect,
  revoke,
  removeContactSyncToken,
  updateProfile,
  updatePrimaryEmail,
  updateRechatMicrosoftCalendar,
  resetRechatMicrosoftCalendar,
  updateContactFoldersSyncToken,
  updateContactsSyncToken
}