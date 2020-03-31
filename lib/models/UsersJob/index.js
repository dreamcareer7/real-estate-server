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

  if (calendars.length < 1)
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)

  return calendars[0]
}

/**
 * @param {UUID} google_credential
 * @param {String} jobName
 */
UsersJob.getByGoogleCredential = async (google_credential, jobName) => {
  const ids = await db.selectIds('users_job/get_by_gcredential', [google_credential, jobName])

  if (ids.length < 1)
    return null

  return await UsersJob.get(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String} status
 */
UsersJob.upsertByGoogleCredential = async (credential, jobName, status) => {
  const microsoft_credential = null
  const start_at = new Date()

  return await db.select('users_job/upsert_by_gcredential', [
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
 * @param {UUID} microsoft_credential
 * @param {String} jobName
 */
UsersJob.getByMicrosoftCredential = async (microsoft_credential, jobName) => {
  const ids = await db.selectIds('users_job/get_by_mcredential', [microsoft_credential, jobName])

  if (ids.length < 1)
    return null

  return await UsersJob.get(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String} status
 */
UsersJob.upsertByMicrosoftCredential = async (credential, jobName, status) => {
  const microsoft_credential = null
  const start_at = new Date()

  return await db.select('users_job/upsert_by_mcredential', [
    credential.user,
    credential.brand,
    credential.id,
    microsoft_credential,
    jobName,
    status,
    start_at
  ])
}


Orm.register('users_jobs', 'UsersJob', UsersJob)

module.exports = UsersJob