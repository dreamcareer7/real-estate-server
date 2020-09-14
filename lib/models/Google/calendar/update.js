const db = require('../../../utils/db.js')


/**
 * @param {UUID} id
 * @param {String} syncToken 
 */
const updateSyncToken = async (id, syncToken) => {
  return await db.selectId('google/calendar/update_sync_token', [id, syncToken])
}


/**
 * @param {UUID} id
 * @param {UUID} channelId
 * @param {String} status
 * @param {Object} result
 */
const updateWatcher = async (id, channelId, status, result = {}) => {
  return await db.select('google/calendar/update_watcher', [id, status, channelId, JSON.stringify(result)])
}


module.exports = {
  updateSyncToken,
  updateWatcher
}