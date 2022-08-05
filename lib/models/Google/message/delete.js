const db = require('../../../utils/db.js')

const EmailThread = require('../../Email/thread/action')
const { getByThreadKeys } = require('./get')


/**
 * @param {UUID} google_credential Google credential id
 * @param {UUID[]} ids
 */
const deleteMany = async (google_credential, ids) => {
  const threads = await db.map('google/message/delete_many', [ids], 'thread_key')

  await EmailThread.updateGoogle(threads, google_credential, { event: 'delete' })
  await EmailThread.prune(threads, { google_credential })
}

/**
 * @param {UUID} google_credential Google credential id
 */
const deleteByCredential = async (google_credential) => {
  const ids = await db.selectIds('google/message/get_by_credential', [google_credential])
  
  if (ids.length > 0) {
    await deleteMany(google_credential, ids)
  }
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} message_ids Google remote-ids
 */
const deleteByMessageIds = async (google_credential, message_ids) => {
  if ( message_ids.length === 0 ) {
    return
  }
  
  const ids = await db.selectIds('google/message/get_by_message_id', [google_credential, message_ids])
  
  if (ids.length > 0) {
    await deleteMany(google_credential, ids)
  }
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} thread_keys
 */
const deleteByThreadKeys = async (google_credential, thread_keys) => {
  const ids = await getByThreadKeys(google_credential, thread_keys)
  
  if (ids.length > 0) {
    await deleteMany(google_credential, ids)
  }
}


module.exports = {
  deleteMany,
  deleteByCredential,
  deleteByMessageIds,
  deleteByThreadKeys
}
