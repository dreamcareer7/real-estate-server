const _       = require('lodash')
const request = require('request-promise-native')
const { EventEmitter } = require('events')


const config = require('../../config')
const db     = require('../../utils/db.js')
const squel  = require('../../utils/squel_extensions')
const Slack  = require('../Slack')

const Orm         = require('../Orm')
const EmailThread = require('../Email/thread')
const Crypto  = require('../Crypto')
const GoogleCredential = require('./credential')

const getClient = require('./client')
const Gmail     = require('./gmail')
const { generateRecord, processLabels } = require('./workers/gmail/common')


const GoogleMessage = {}
const emitter = new EventEmitter()

GoogleMessage.on   = emitter.on.bind(emitter)
GoogleMessage.once = emitter.once.bind(emitter)



const createEmailObject = async function (params) {
  const attachments = []
  const limit    = config.google_integration.attachment_size_limit
  const limitMsg = `${Math.round((limit / (1024 * 1024)) * (3 / 4))}MB`

  let sizeSum = 0

  for (const att of params.attachments) {
    const imageData = await request.get({
      url: att.url,
      encoding: 'binary'
    })

    const base64 = Buffer.from(imageData, 'binary').toString('base64')
    const size   = base64.length // in bytes

    sizeSum += size

    if ( size > limit )
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)

    attachments.push({
      'filename': att.name || att.file_name,
      'contentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
      'cid': att.content_id || null,
      'content': base64,
      'encoding': 'base64',
      'type': att.type
    })
  }

  if ( sizeSum > limit )
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)

  const toRecipients  = params.header.to ? params.header.to.map(record => (record.address)) : []
  const ccRecipients  = params.header.cc ? params.header.cc.map(record => (record.address)) : []
  const bccRecipients = params.header.bcc ? params.header.bcc.map(record => (record.address)) : []

  return {
    headers: {
      From: params.header.from,
      To: toRecipients.join(','),
      Cc: ccRecipients.join(','),
      Bcc: bccRecipients.join(','),
      'In-Reply-To': params.header['In-Reply-To'],
  
      Subject: params.header.subject
    },

    threadId: params.threadId,
    attachments: attachments,

    text: params.body.text,
    html: params.body.html
  }
}

/**
 * @param {UUID[]} ids
 */
GoogleMessage.getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  const { select } = Orm.getPublicFields()
  const shouldFetchBody = Array.isArray(select.google_message) && select.google_message.includes('html_body')

  const DELETED_MSG = 'Email is moved or deleted in the remote server'

  if (shouldFetchBody) {
    const by_credential = _.groupBy(messages, 'google_credential')

    for (const google_credential in by_credential) {
      const bodies = await Gmail.fetchMessage(google_credential, messages.map(m => m.message_id))

      for (const message of messages) {
        const root = bodies[message.message_id]

        if (!root) {
          Slack.send({ channel: 'integration_logs', text: `remote-gmail-message-not-found id: ${message.id}`, emoji: ':skull:' })
        }

        message.is_read = root ? ((root.labelIds) ? ((root.labelIds.includes('UNREAD')) ? false : true) : false) : false
        message.snippet = root ? (root['snippet'] || '') : DELETED_MSG
        message.unique_body = root ? (root['uniqueBody'] || '') : DELETED_MSG
        message.html_body = root ? (root['htmlBody'] || '') : DELETED_MSG
        message.text_body = root ? (root['textBody'] || '') : DELETED_MSG
      }
    }
  }

  return messages
}

/**
 * @param {UUID} id
 */
GoogleMessage.get = async (id) => {
  const messages = await GoogleMessage.getAll([id])

  if (messages.length < 1)
    throw Error.ResourceNotFound(`GoogleMessage ${id} not found.`)

  return messages[0]
}

/**
 * @param {string} message_id Message remote-id
 * @param {UUID} google_credential
 */
GoogleMessage.getByMessageId = async (message_id, google_credential) => {
  const ids = await db.selectIds('google/message/find_by_message_id', [message_id, google_credential])
  
  if (ids.length < 1)
    throw Error.ResourceNotFound(`GoogleMessage ${message_id} in credential ${google_credential} not found.`)

  return GoogleMessage.get(ids[0])
}

/**
 * @param {UUID} google_credential Google credential id
 */
GoogleMessage.getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

/**
 * @param {string[]} thread_keys
 */
GoogleMessage.getDistinctCredentialByThread = async (thread_keys) => {
  const result = await db.select('google/message/find_distinc_credential', [thread_keys])

  return result.map(record => record.google_credential)
}

/**
 * @param {UUID[]} ids
 */
GoogleMessage.getDistinctCredentialByMessage = async (ids) => {
  const result = await db.select('google/message/find_distinc_credential_by_msg', [ids])

  return result.map(record => record.google_credential)
}

/**
 * @param {UUID} google_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
GoogleMessage.getByInternetMessageIds = async (google_credential, internet_message_ids) => {
  const ids = await db.selectIds('google/message/get_by_internet_message_id', [google_credential, internet_message_ids])
  
  if ( ids.length > 0 ) {
    return await GoogleMessage.getAll(ids)
  }

  return []
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} thread_keys
 */
GoogleMessage.getByThreadKeys = async (google_credential, thread_keys) => {
  return await db.selectIds('google/message/get_by_credential_and_thread_keys', [google_credential, thread_keys])
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {UUID[]} ids
 */
GoogleMessage.filterMessageIds = async (google_credential, ids) => {
  return await db.selectIds('google/message/filter_message_ids', [google_credential, ids])
}

/**
 * @param {any[]} records
 * @param {UUID} google_credential
 */
GoogleMessage.create = async (records, google_credential) => {
  if (records.length === 0)
    return []

  const res = await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'message_id'], {
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        thread_key: squel.rstr('EXCLUDED.thread_key'),
        history_id: squel.rstr('EXCLUDED.history_id'),
        internet_message_id: squel.rstr('EXCLUDED.internet_message_id'),
        in_reply_to: squel.rstr('EXCLUDED.in_reply_to'),
        in_bound: squel.rstr('EXCLUDED.in_bound'),
        is_read: squel.rstr('EXCLUDED.is_read'),
        is_archived: squel.rstr('EXCLUDED.is_archived'),
        recipients: squel.rstr('EXCLUDED.recipients'),

        subject: squel.rstr('EXCLUDED.subject'),
        has_attachments: squel.rstr('EXCLUDED.has_attachments'),
        attachments: squel.rstr('EXCLUDED.attachments'),
        label_ids: squel.rstr('EXCLUDED.label_ids'),

        from_raw: squel.rstr('EXCLUDED.from_raw'),
        to_raw: squel.rstr('EXCLUDED.to_raw'),
        cc_raw: squel.rstr('EXCLUDED.cc_raw'),
        bcc_raw: squel.rstr('EXCLUDED.bcc_raw'),

        '"from"': squel.rstr('EXCLUDED.from'),
        '"to"': squel.rstr('EXCLUDED.to'),
        cc: squel.rstr('EXCLUDED.cc'),
        bcc: squel.rstr('EXCLUDED.bcc'),

        message_created_at: squel.rstr('EXCLUDED.message_created_at'),
        message_date: squel.rstr('EXCLUDED.message_date'),

        deleted_at: squel.rstr('EXCLUDED.deleted_at'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, message_id, thread_id, thread_key')

    q.name = `google/message/bulk_upsert#${i}`

    return db.select(q)
  })

  await EmailThread.updateGoogle(_.uniq(res.map(r => r.thread_key)), google_credential)

  // Handle deleted emails ( Actually an email-message with TRASH label )
  const deletedIds = records.filter(msg => msg.deleted_at).map(msg => msg.message_id)
  await GoogleMessage.deleteByMessageIds(records[0].google_credential, deletedIds)

  return res
}

/**
 * @param {UUID[]} ids
 * @param {boolean} status 
 * @param {UUID} google_credential
 */
GoogleMessage.updateIsRead = async (ids, status, google_credential) => {
  const threads = await db.map('google/message/update_is_read', [
    ids,
    status
  ], 'thread_key')

  await EmailThread.updateGoogle(threads, google_credential)
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {UUID[]} ids
 */
GoogleMessage.deleteMany = async (google_credential, ids) => {
  const threads = await db.map('google/message/delete_many', [ids], 'thread_key')

  await EmailThread.updateGoogle(threads, google_credential)
  await EmailThread.prune(threads, { google_credential })
}

/**
 * @param {UUID} google_credential Google credential id
 */
GoogleMessage.deleteByCredential = async (google_credential) => {
  const ids = await db.selectIds('google/message/get_by_credential', [google_credential])
  
  if (ids.length > 0) {
    await GoogleMessage.deleteMany(google_credential, ids)
  }
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} message_ids Google remote-ids
 */
GoogleMessage.deleteByMessageIds = async (google_credential, message_ids) => {
  if ( message_ids.length === 0 ) {
    return
  }
  
  const ids = await db.selectIds('google/message/get_by_message_id', [google_credential, message_ids])
  
  if (ids.length > 0) {
    await GoogleMessage.deleteMany(google_credential, ids)
  }
}

/**
 * @param {UUID} google_credential Google credential id
 * @param {string[]} thread_keys
 */
GoogleMessage.deleteByThreadKeys = async (google_credential, thread_keys) => {
  const ids = await GoogleMessage.getByThreadKeys(google_credential, thread_keys)
  
  if (ids.length > 0) {
    await GoogleMessage.deleteMany(google_credential, ids)
  }
}

GoogleMessage.publicize = async (message) => {
  const uts = new Date().getTime()
  const expires_at = uts + (60 * 60 * 1000)

  if (message.has_attachments) {
    for (const attach of message.attachments) {

      const hash = encodeURIComponent(Crypto.encrypt(JSON.stringify({
        google_credential: message.google_credential,
        message_id: message.id,
        message_remote_id: message.message_id,
        attachment_id: attach.id,
        expires_at
      })))

      attach.url = `https://${process.env.API_HOSTNAME}/emails/attachments/${hash}`
      attach.type = 'google_message_attachment'
    }
  }

  return message
}

/**
 * @param {UUID} gcid Google credential id
 * @param {string} mid Message remote-id
 * @param {string} aid Attachment remote-id
 */
GoogleMessage.downloadAttachment = async (gcid, mid, aid) => {
  const google  = await getClient(gcid, 'gmail')
  const message = await GoogleMessage.getByMessageId(mid, gcid)

  if (!message)
    throw Error.ResourceNotFound('Related Google-Message Not Found!')

  let attachmentObj = null

  for (const att of message.attachments) {
    if ( att.id === aid )
      attachmentObj = att
  }

  if (!attachmentObj)
    throw Error.ResourceNotFound('Gmail message\'s attachment not found!')

  const attachment = await google.getAttachment(mid, aid)

  return {
    attachmentObj,
    attachment
  }
}

/**
 * @param {UUID} gcid
 * @param {string} messageId
 */
GoogleMessage.getRemoteMessage = async (gcid, messageId) => {
  const google  = await getClient(gcid, 'gmail')
  const message = await google.getMessage(messageId)

  if (!message.id) throw Error.ResourceNotFound('GoogleMessage#getRemoteMessage failed cause message.id is null!')

  const toCreateMeesagesArr = []

  toCreateMeesagesArr.push(generateRecord(gcid, message))

  await processLabels(gcid, toCreateMeesagesArr)

  const result = await GoogleMessage.create(toCreateMeesagesArr, gcid)

  return await GoogleMessage.get(result[0].id)
}

GoogleMessage.sendEmail = async (params) => {
  const google = await getClient(params.credential.id, 'gmail')
  const body   = await createEmailObject(params)

  return await google.sendMultipartMessage(body)
}

GoogleMessage.updateReadStatus = async (gcid, ids, status) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await GoogleMessage.getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)

  await google.updateReadStatus(remote_message_ids, status)

  return await GoogleMessage.updateIsRead(ids, status, gcid)
}

GoogleMessage.batchTrash = async (gcid, ids) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await GoogleMessage.getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await google.batchTrash(remote_message_ids)

  return await GoogleMessage.deleteMany(gcid, ids)
}

GoogleMessage.batchArchive = async (gcid, ids) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await GoogleMessage.getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await google.batchArchive(remote_message_ids)

  return await GoogleMessage.deleteMany(gcid, ids)
}

GoogleMessage.watchMailBox = async (gcid) => {
  const google = await getClient(gcid, 'gmail')
  return await google.watchMailBox()
}

GoogleMessage.stopWatchMailBox = async (gcid) => {
  const google = await getClient(gcid, 'gmail')

  await google.stopWatchMailBox()
  await GoogleCredential.updateMessagesSyncHistoryId(gcid, null, null)

  return true
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage
