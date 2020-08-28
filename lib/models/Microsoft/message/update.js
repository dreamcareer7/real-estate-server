const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')

const EmailThread = require('../../Email/thread/action')


/**
 * @param {UUID[]} ids
 * @param {boolean} status
 * @param {UUID} microsoft_credential
 */
const updateIsRead = async (ids, status, microsoft_credential) => {
  const threads = await db.map('microsoft/message/update_is_read', [
    ids,
    status
  ], 'thread_key')

  await EmailThread.updateMicrosoft(threads, microsoft_credential)
}

const setCampaigns = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('microsoft_messages', 'mmessages')
      .set('campaign = uv.campaign::uuid')
      .from('update_values', 'uv')
      .where('mmessages.microsoft_credential = uv.microsoft_credential::uuid')
      .where('mmessages.message_id = uv.message_id::text')

    q.name = 'microsoft_messages/set_campaign'

    return db.update(q, [])
  })  
}


module.exports = {
  updateIsRead,
  setCampaigns
}