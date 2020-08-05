const db = require('../../utils/db.js')


/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  return await db.select('users_job/get', [ids])
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const calendars = await getAll([id])

  if (calendars.length < 1) {
    throw Error.ResourceNotFound(`Calendar integration by id ${id} not found.`)
  }

  return calendars[0]
}


module.exports = {
  getAll,
  get
}