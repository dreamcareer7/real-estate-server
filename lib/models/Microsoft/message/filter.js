const db = require('../../../utils/db.js')


/**
 * @param {UUID} microsoft_credential Google credential id
 * @param {UUID[]} ids
 */
const filterMessageIds = async (microsoft_credential, ids) => {
  return await db.selectIds('microsoft/message/filter_message_ids', [microsoft_credential, ids])
}


module.exports = {
  filterMessageIds
}