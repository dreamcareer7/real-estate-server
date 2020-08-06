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


module.exports = {
  getAll,
  get,
  getAllByGoogleCredential
}