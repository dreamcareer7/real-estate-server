const db = require('../../../utils/db.js')
const EmailThread = require('../../Email/thread/action')
const Emitter = require('./emitter')

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

  Emitter.emit('update:is_read', { threads, ids, microsoft_credential })
  await EmailThread.updateMicrosoft(threads, microsoft_credential, { event: 'update' })
}


module.exports = {
  updateIsRead
}
