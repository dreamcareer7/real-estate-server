const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('microsoft/calendar/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1) {
    throw Error.ResourceNotFound(`Microsoft calendar by id ${id} not found.`)
  }

  return calendars[0]
}

/**
 * @param {UUID} credentialId
 */
const getAllByMicrosoftCredential = async (credentialId) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_credential', [credentialId])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID} credentialId
 * @param {String[]} remoteCalendarIds
 */
const getByRemoteCalendarIds = async (credentialId, remoteCalendarIds) => {
  const ids = await db.selectIds('microsoft/calendar/get_by_remote_cal', [credentialId, remoteCalendarIds])

  if ( ids.length === 0 ) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID} credentialId
 * @param {String} remoteCalendarId 
 */
const getByRemoteCalendarId = async (credentialId, remoteCalendarId) => {
  const result = await getByRemoteCalendarIds(credentialId, [remoteCalendarId])

  if ( result.length === 0 ) {
    return null
  }

  return result[0]
}


module.exports = {
  getAll,
  get,
  getAllByMicrosoftCredential,
  getByRemoteCalendarIds,
  getByRemoteCalendarId
}