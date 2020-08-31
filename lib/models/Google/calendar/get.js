const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('google/calendar/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1) {
    throw Error.ResourceNotFound(`Google calendar by id ${id} not found.`)
  }

  return calendars[0]
}

/**
 * @param {UUID} googleCredentialId
 */
const getAllByGoogleCredential = async (googleCredentialId) => {
  const ids = await db.selectIds('google/calendar/get_by_credential', [googleCredentialId])

  if (ids.length < 1) {
    return []
  }

  return await getAll(ids)
}

/**
 * @param {UUID} googleCredentialId
 * @param {String} remoteCalendarId 
 */
const getByRemoteCalendarId = async (googleCredentialId, remoteCalendarId) => {
  const ids = await db.selectIds('google/calendar/get_by_remote_cal', [googleCredentialId, remoteCalendarId])

  if ( ids.length === 0 ) {
    return null
  }

  return await get(ids[0])
}


module.exports = {
  getAll,
  get,
  getAllByGoogleCredential,
  getByRemoteCalendarId
}