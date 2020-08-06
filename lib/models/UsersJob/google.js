const db = require('../../utils/db.js')

const { get } = require('./get')


/**
 * @param {UUID} google_credential
 * @param {String} jobName
 */
const getByGoogleCredential = async (google_credential, jobName) => {
  const ids = await db.selectIds('users_job/google/get_by_gcredential', [google_credential, jobName])

  if (ids.length < 1) {
    return null
  }

  return await get(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String?} status
 */
const upsertByGoogleCredential = async (credential, jobName, status) => {
  const microsoft_credential = null
  const start_at = status ? new Date() : null // status ==> null, failed, pending, success

  return await db.select('users_job/google/upsert_by_gcredential', [
    credential.user,
    credential.brand,
    credential.id,
    microsoft_credential,
    jobName,
    status,
    start_at
  ])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
const checkLockByGoogleCredential = async (cid, jobName) => {
  const ids = await db.selectIds('users_job/google/chk_lock_by_gcredential', [cid, jobName])

  if (ids.length < 1) {
    return null
  }

  return await get(ids[0])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
const lockByGoogleCredential = async (cid, jobName) => {
  return db.update('users_job/google/lock_by_gcredential', [cid, jobName])
}

/**
 * @param {UUID} cid google_credential_id
 */
const deleteByGoogleCredential = async (cid) => {
  return db.update('users_job/google/delete_by_gcredential', [cid])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
const deleteByGoogleCredentialAndJob = async (cid, jobName) => {
  return db.update('users_job/google/delete_by_gcredential_and_job', [cid, jobName])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
const forceSyncByGoogleCredential = async (cid, jobName) => {
  return db.update('users_job/google/force_sync_by_gcredential', [cid, jobName])
}


module.exports = {
  getByGoogleCredential,
  upsertByGoogleCredential,
  checkLockByGoogleCredential,
  lockByGoogleCredential,
  deleteByGoogleCredential,
  deleteByGoogleCredentialAndJob,
  forceSyncByGoogleCredential,
}