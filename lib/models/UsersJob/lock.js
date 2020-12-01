const db = require('../../utils/db.js')

const { get } = require('./get')


/**
 * @param {UUID} id
 */
const checkLock = async (id) => {
  const ids = await db.selectIds('users_job/chk_lock', [id])

  if (ids.length < 1) {
    return null
  }

  return await get(ids[0])
}

/**
 * @param {UUID} id
 */
const lock = async (id) => {
  return db.update('users_job/lock', [id])
}


module.exports = {
  checkLock,
  lock
}