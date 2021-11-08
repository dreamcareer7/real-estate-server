const db = require('../../utils/db.js')

const { get } = require('./get')


/**
 * @param {UUID} microsoft_credential
 * @param {String} jobName
 */
const getByMicrosoftCredential = async (microsoft_credential, jobName) => {
  const ids = await db.selectIds('users_job/microsoft/get_by_mcredential', [microsoft_credential, jobName])

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
const upsertByMicrosoftCredential = async (credential, jobName, status = 'waiting', metadata = null, recurrence = true) => {
  const google_credential = null
  const start_at = status ? new Date() : null // status ==> null, failed, pending, success

  return await db.select('users_job/microsoft/upsert_by_mcredential', [
    credential.user,
    credential.brand,
    google_credential,
    credential.id,
    jobName,
    status,
    start_at,
    metadata,
    recurrence
  ])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 */
const checkLockByMicrosoftCredential = async (cid, jobName) => {
  const ids = await db.selectIds('users_job/microsoft/chk_lock_by_mcredential', [cid, jobName])

  if (ids.length < 1) {
    return null
  }

  return await get(ids[0])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 */
const lockByMicrosoftCredential = async (cid, jobName) => {
  return db.update('users_job/microsoft/lock_by_mcredential', [cid, jobName])
}

/**
 * @param {UUID} cid microsoft_credential_id
 */
const deleteByMicrosoftCredential = async (cid) => {
  return db.update('users_job/microsoft/delete_by_mcredential', [cid])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 */
const deleteByMicrosoftCredentialAndJob = async (cid, jobName) => {
  return db.update('users_job/microsoft/delete_by_mcredential_and_job', [cid, jobName])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 */
const forceSyncByMicrosoftCredential = async (cid, jobName) => {
  return db.update('users_job/microsoft/force_sync_by_mcredential', [cid, jobName])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 * @param {String} interval
 */
const postponeByMicrosoftCredential = async (cid, jobName, interval) => {
  return db.update('users_job/microsoft/postpone_sync_by_mcredential', [cid, jobName, interval])
}


module.exports = {
  getByMicrosoftCredential,
  upsertByMicrosoftCredential,
  checkLockByMicrosoftCredential,
  lockByMicrosoftCredential,
  deleteByMicrosoftCredential,
  deleteByMicrosoftCredentialAndJob,
  forceSyncByMicrosoftCredential,
  postponeByMicrosoftCredential
}