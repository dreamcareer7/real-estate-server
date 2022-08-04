const { groupBy } = require('lodash')

const config = require('../../../config')
const db     = require('../../../utils/db.js')
const Slack  = require('../../Slack')

const Orm = {
  ...require('../../Orm/registry'),
  ...require('../../Orm/context'),
}

const Gmail = require('../gmail')

const channel = config.google_integration.slack_channel



/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  const { select } = Orm.getPublicFields()
  const shouldFetchBody = Array.isArray(select.google_message) && select.google_message.includes('html_body')

  const DELETED_MSG = 'Email is moved or deleted in the remote server'

  if (shouldFetchBody) {
    const by_credential = groupBy(messages, 'google_credential')

    for (const google_credential in by_credential) {
      const bodies = await Gmail.fetchMessage(google_credential, messages.map(m => m.message_id))

      for (const message of messages) {
        const root = bodies[message.message_id]

        if (!root) {
          Slack.send({ channel, text: `remote-gmail-message-not-found id: ${message.id}`, emoji: ':skull:' })
        }

        message.is_read     = root ? ((root.labelIds) ? ((root.labelIds.includes('UNREAD')) ? false : true) : false) : false
        message.snippet     = root ? (root['snippet'] || '') : DELETED_MSG
        message.unique_body = root ? (root['uniqueBody'] || '') : DELETED_MSG
        message.html_body   = root ? (root['htmlBody'] || '') : DELETED_MSG
        message.text_body   = root ? (root['textBody'] || '') : DELETED_MSG
      }
    }
  }

  return messages
}

/**
 * @param {UUID} id
 */
const get = async (id) => {
  const messages = await getAll([id])

  if (messages.length < 1) {
    throw Error.ResourceNotFound(`GoogleMessage ${id} not found.`)
  }

  return messages[0]
}

/**
 * @param {string} message_id Message remote-id
 * @param {UUID} google_credential
 */
const getByMessageId = async (message_id, google_credential) => {
  const ids = await db.selectIds('google/message/find_by_message_id', [message_id, google_credential])
  
  if (ids.length < 1) {
    throw Error.ResourceNotFound(`GoogleMessage ${message_id} in credential ${google_credential} not found.`)
  }

  return get(ids[0])
}

/**
 * @param {UUID} google_credential Google credential id
 */
const getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

/**
 * @param {string[]} thread_keys
 */
const getDistinctCredentialByThread = async (thread_keys) => {
  const result = await db.select('google/message/find_distinc_credential', [thread_keys])

  return result.map(record => record.google_credential)
}

/**
 * @param {UUID[]} ids
 */
const getDistinctCredentialByMessage = async (ids) => {
  const result = await db.select('google/message/find_distinc_credential_by_msg', [ids])

  return result.map(record => record.google_credential)
}

/**
 * @param {UUID} google_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
const getByInternetMessageIds = async (google_credential, internet_message_ids) => {
  const ids = await db.selectIds('google/message/get_by_internet_message_id', [google_credential, internet_message_ids])
  
  if ( ids.length > 0 ) {
    return await getAll(ids)
  }

  return []
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} thread_keys
 */
const getByThreadKeys = async (google_credential, thread_keys) => {
  return await db.selectIds('google/message/get_by_credential_and_thread_keys', [google_credential, thread_keys])
}


module.exports = {
  getAll,
  get,
  getByMessageId,
  getGCredentialMessagesNum,
  getDistinctCredentialByThread,
  getDistinctCredentialByMessage,
  getByInternetMessageIds,
  getByThreadKeys
}