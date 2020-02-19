const db  = require('../../utils/db.js')
const Orm = require('../Orm')


const UsersJob = {}


UsersJob.insert = async (records) => {
  if (records.length === 0)
    return []

  return db.select('calendar_integration/insert', [JSON.stringify(records)])
}

/**
 * @param {UUID[]} ids
 */
UsersJob.getAll = async (ids) => {
  return await db.select('calendar_integration/get', [ids])
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
  const ids = await db.selectIds('calendar_integration/get_by_gcredential', [google_credential, jobName])

  if (ids.length < 1)
    return null

  return await UsersJob.getAll(ids[0])
}

/**
 * @param {Object} credential
 * @param {String} jobName
 * @param {String} status
 */
UsersJob.upsertByGoogleCredential = async (credential, jobName, status) => {
  const ids = await db.selectIds('calendar_integration/upsert_by_gcredential', [
    credential.user,
    credential.brand,
    credential.id,
    null,
    jobName,
    status
  ])

  if (ids.length < 1)
    return null

  return await UsersJob.getAll(ids[0])
}

/**
 * @param {UUID} google_credential
 * @param {String} jobName
 * @param {String} status
 */
UsersJob.updateByGoogleCredential = async (google_credential, jobName, status) => {
  return await db.select('calendar_integration/update_by_gcredential', [
    google_credential,
    jobName,
    status
  ])
}



Orm.register('users_jobs', 'UsersJob', UsersJob)

module.exports = UsersJob