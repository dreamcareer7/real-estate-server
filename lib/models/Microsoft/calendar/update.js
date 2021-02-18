const db = require('../../../utils/db.js')


/**
 * @param {UUID[]} ids
 * @param {Boolean} flag
 */
const updateToSync = async (ids, flag) => {
  return await db.select('microsoft/calendar/update_to_sync', [ids, flag])
}

/**
 * @param {UUID} id
 * @param {String?} syncToken 
 */
const updateDeltaToken = async (id, syncToken) => {
  return await db.selectId('microsoft/calendar/update_delta_token', [id, syncToken])
}


module.exports = {
  updateToSync,
  updateDeltaToken
}