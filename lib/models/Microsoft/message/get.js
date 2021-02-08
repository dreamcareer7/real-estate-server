const _ = require('lodash')

const config = require('../../../config')
const db     = require('../../../utils/db.js')
const Slack  = require('../../Slack')
const Crypto = require('../../Crypto')

const Orm = {
  ...require('../../Orm/context')
}

const Outlook = require('../outlook')

const channel = config.microsoft_integration.slack_channel



/**
 * @param {UUID[]} ids
 */
const getAll = async (ids) => {
  const messages = await db.select('microsoft/message/get', [ids])

  const { select } = Orm.getPublicFields()
  const shouldFetchBody = Array.isArray(select.microsoft_message) && select.microsoft_message.includes('html_body')

  if (shouldFetchBody) {
    const by_credential = _.groupBy(messages, 'microsoft_credential')

    for (const microsoft_credential in by_credential) {
      const bodies = await Outlook.fetchMessage(microsoft_credential, messages.map(m => m.message_id))

      for (const message of messages) {
        const root = bodies[message.message_id]

        if (root) {

          const attachments  = root.attachments || []
          const refined_attachments = attachments.map(att => {
            const uts = new Date().getTime()
            const expires_at = uts + (60 * 60 * 1000)
          
            const hash = encodeURIComponent(Crypto.encrypt(JSON.stringify({
              microsoft_credential: message.microsoft_credential,
              message_id: message.id,
              message_remote_id: message.message_id,
              attachment_id: att.id,
              expires_at
            })))
      
            att.url  = `https://${process.env.API_HOSTNAME}/emails/attachments/${hash}`
            att.type = 'microsoft_message_attachment'
            att.cid  = att.contentId
            return att
          })
  
          message.is_read     = root.isRead
          message.snippet     = root['snippet'] || ''
          message.html_body   = root['htmlBody'] || ''
          message.attachments = refined_attachments

        } else {

          Slack.send({ channel, text: `remote-outlook-message-not-found id: ${message.id}`, emoji: ':skull:' })

          message.is_read     = true
          message.snippet     = 'Email is moved or deleted in the remote server'
          message.html_body   = 'Email is moved or deleted in the remote server'
          message.attachments = []
        }
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
    throw Error.ResourceNotFound(`MicrosoftMessage ${id} not found.`)
  }

  return messages[0]
}

/**
 * @param {string} message_id Message remote-id
 * @param {UUID} microsoft_credential
 */
const getByMessageId = async (message_id, microsoft_credential) => {
  const ids = await db.selectIds('microsoft/message/find_by_message_id', [message_id, microsoft_credential])

  if (ids.length < 1) {
    throw Error.ResourceNotFound(`MicrosoftMessage ${message_id} in credential ${microsoft_credential} not found.`)
  }

  return get(ids[0])
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 */
const getMCredentialMessagesNum = async (microsoft_credential) => {
  return await db.select('microsoft/message/count', [microsoft_credential])
}

/**
 * @param {string[]} thread_keys
 */
const getDistinctCredentialByThread = async (thread_keys) => {
  const result = await db.select('microsoft/message/find_distinc_credential', [thread_keys])

  return result.map(record => record.microsoft_credential)
}

/**
 * @param {UUID[]} ids
 */
const getDistinctCredentialByMessage = async (ids) => {
  const result = await db.select('microsoft/message/find_distinc_credential_by_msg', [ids])

  return result.map(record => record.microsoft_credential)
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
const getByInternetMessageIds = async (microsoft_credential, internet_message_ids) => {
  const ids = await db.selectIds('microsoft/message/get_by_internet_message_id', [microsoft_credential, internet_message_ids])
  
  if ( ids.length > 0 ) {
    return await getAll(ids)
  }

  return []
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} thread_keys
 */
const getByThreadKeys = async (microsoft_credential, thread_keys) => {
  return await db.selectIds('microsoft/message/get_by_credential_and_thread_keys', [microsoft_credential, thread_keys])
}


module.exports = {
  getAll,
  get,
  getByMessageId,
  getMCredentialMessagesNum,
  getDistinctCredentialByThread,
  getDistinctCredentialByMessage,
  getByInternetMessageIds,
  getByThreadKeys
}