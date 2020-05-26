const db  = require('../../utils/db.js')
const Orm = require('../Orm')


const UsersJob = {}


/**
 * @param {UUID[]} ids
 */
UsersJob.getAll = async (ids) => {
  return await db.select('users_job/get', [ids])
}

/**
 * @param {UUID} id
 */
UsersJob.get = async (id) => {
  const calendars = await UsersJob.getAll([id])

  if (calendars.length < 1) {
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)
  }

  return calendars[0]
}


/**
 * @param {UUID} google_credential
 * @param {String} jobName
 */
UsersJob.getByGoogleCredential = async (google_credential, jobName) => {
  const ids = await db.selectIds('users_job/google/get_by_gcredential', [google_credential, jobName])

  if (ids.length < 1) {
    return null
  }

  return await UsersJob.get(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String?} status
 */
UsersJob.upsertByGoogleCredential = async (credential, jobName, status) => {
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
UsersJob.lockByGoogleCredential = async (cid, jobName) => {
  return db.update('users_job/google/lock_by_gcredential', [cid, jobName])
}

/**
 * @param {UUID} cid google_credential_id
 */
UsersJob.deleteByGoogleCredential = async (cid) => {
  return db.update('users_job/google/delete_by_gcredential', [cid, new Date()])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
UsersJob.forceSyncByGoogleCredential = async (cid, jobName) => {
  return db.update('users_job/google/force_sync_by_gcredential', [cid, jobName])
}


/**
 * @param {UUID} microsoft_credential
 * @param {String} jobName
 */
UsersJob.getByMicrosoftCredential = async (microsoft_credential, jobName) => {
  const ids = await db.selectIds('users_job/microsoft/get_by_mcredential', [microsoft_credential, jobName])

  if (ids.length < 1) {
    return null
  }

  return await UsersJob.get(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String?} status
 */
UsersJob.upsertByMicrosoftCredential = async (credential, jobName, status) => {
  const google_credential = null
  const start_at = status ? new Date() : null // status ==> null, failed, pending, success

  return await db.select('users_job/microsoft/upsert_by_mcredential', [
    credential.user,
    credential.brand,
    google_credential,
    credential.id,
    jobName,
    status,
    start_at
  ])
}

/**
 * @param {UUID} cid microsoft_credential_id
 * @param {String} jobName
 */
UsersJob.lockByMicrosoftCredential = async (cid, jobName) => {
  return db.update('users_job/microsoft/lock_by_mcredential', [cid, jobName])
}

/**
 * @param {UUID} cid microsoft_credential_id
 */
UsersJob.deleteByMicrosoftCredential = async (cid) => {
  return db.update('users_job/microsoft/delete_by_mcredential', [cid, new Date()])
}

/**
 * @param {UUID} cid google_credential_id
 * @param {String} jobName
 */
UsersJob.forceSyncByMicrosoftCredential = async (cid, jobName) => {
  return db.update('users_job/microsoft/force_sync_by_mcredential', [cid, jobName])
}



Orm.register('users_jobs', 'UsersJob', UsersJob)

module.exports = UsersJob