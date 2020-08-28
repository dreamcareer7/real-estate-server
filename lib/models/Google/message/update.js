const db = require('../../../utils/db.js')
const EmailThread = require('../../Email/thread/action')


/**
 * @param {UUID[]} ids
 * @param {boolean} status 
 * @param {UUID} google_credential
 */
const updateIsRead = async (ids, status, google_credential) => {
  const threads = await db.map('google/message/update_is_read', [ids, status ], 'thread_key')

  await EmailThread.updateGoogle(threads, google_credential)
}

/**
 * @param {UUID} id
 * @param {string} campaign
 */
const setCampaign = async (id, campaign) => {
  return db.update('google/message/set_campaign', [id, campaign])
}


module.exports = {
  updateIsRead,
  setCampaign
}