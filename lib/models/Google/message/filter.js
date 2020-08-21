const db = require('../../../utils/db.js')


/**
 * @param {UUID} google_credential Google credential id
 * @param {UUID[]} ids
 */
const filterMessageIds = async (google_credential, ids) => {
  return await db.selectIds('google/message/filter_message_ids', [google_credential, ids])
}


module.exports = {
  filterMessageIds
}