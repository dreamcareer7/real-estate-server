const db = require('../../../utils/db.js')

const EmailThread = require('../../Email/thread/action')
const { getByThreadKeys } = require('./get')


/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {UUID[]} ids
 */
const deleteMany = async (microsoft_credential, ids) => {
  const threads = await db.map('microsoft/message/delete_many', [ids], 'thread_key')

  await EmailThread.updateMicrosoft(threads, microsoft_credential, { event: 'delete' })
  await EmailThread.prune(threads, { microsoft_credential })
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 */
const deleteByCredential = async (microsoft_credential) => {
  const ids = await db.selectIds('microsoft/message/get_by_credential', [microsoft_credential])
  
  if (ids.length > 0) {
    await deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
const deleteByInternetMessageIds = async (microsoft_credential, internet_message_ids) => {
  const ids = await db.selectIds('microsoft/message/get_by_internet_message_id', [microsoft_credential, internet_message_ids])
  
  if (ids.length > 0) {
    await deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} remote_message_ids
 */
const deleteByRemoteMessageIds = async (microsoft_credential, remote_message_ids) => {
  const ids = await db.selectIds('microsoft/message/get_by_remote_message_id', [microsoft_credential, remote_message_ids])
  
  if (ids.length > 0) {
    await deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} thread_keys
 */
const deleteByThreadKeys = async (microsoft_credential, thread_keys) => {
  const ids = await getByThreadKeys(microsoft_credential, thread_keys)
  
  if (ids.length > 0) {
    await deleteMany(microsoft_credential, ids)
  }
}


module.exports = {
  deleteMany,
  deleteByCredential,
  deleteByInternetMessageIds,
  deleteByRemoteMessageIds,
  deleteByThreadKeys
}
