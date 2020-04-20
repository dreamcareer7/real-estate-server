const _       = require('lodash')
const request = require('request-promise-native')
const { EventEmitter } = require('events')

const config = require('../../config')
const db     = require('../../utils/db.js')
const squel  = require('../../utils/squel_extensions')

const Context      = require('../Context')
const Slack        = require('../Slack')
const Orm          = require('../Orm')
const EmailThread  = require('../Email/thread')

const getClient = require('./client')
const Outlook   = require('./outlook')

const MicrosoftMessage = {}
const emitter = new EventEmitter()

MicrosoftMessage.on   = emitter.on.bind(emitter)
MicrosoftMessage.once = emitter.once.bind(emitter)


const handleBigAttachments = async function (microsoft, messageId, attachments) {
  for await (const att of attachments) {
    const attachment = {
      name: att.name || att.file_name,
      url: att.url
    }

    await microsoft.uploadSession(messageId, attachment)
  }
}

const createEmailObject = async function (params) {
  const attachments    = []
  const bigAttachments = []

  const limit     = config.microsoft_integration.attachment_size_limit // 26MB
  const limit_alt = config.microsoft_integration.attachment_size_limit_alt // 3MB
  const limitMsg  = `${Math.round(limit / (1024 * 1024))}MB`

  let sizeSum = 0

  for (const att of params.attachments) {
    const imageData = await request.get({
      url: att.url,
      encoding: 'binary'
    })

    const data    = Buffer.from(imageData, 'binary')
    const base64  = data.toString('base64')
    const size    = data.length // in bytes

    sizeSum += size

    if ( size > limit ) {
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)
    }

    if ( size <= limit_alt ) {
      attachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        'name': att.name || att.file_name,
        'ContentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
        'contentType': att.type,
        'size': size,
        'isInline': att.is_inline,
        'contentBytes': base64
      })
    } else {
      att.size = size
      bigAttachments.push(att)
    }
  }

  if ( sizeSum > limit ) {
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)
  }

  const toRecipients  = params.header.to ? params.header.to.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const ccRecipients  = params.header.cc ? params.header.cc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []
  const bccRecipients = params.header.bcc ? params.header.bcc.map(record => ({ emailAddress: { address: record.address, name: record.name } })) : []

  const email = {
    message: {
      conversationId: params.threadId,
      subject: params.header.subject,
  
      body: {
        contentType: 'html',
        content: params.body.html
      },
  
      from: {
        emailAddress: {
          address: params.credential.email,
          name: params.credential.display_name
        }
      },
      toRecipients: toRecipients,
      ccRecipients: ccRecipients,
      bccRecipients: bccRecipients,

      extensions: params.extensions,
      internetMessageHeaders: params.internetMessageHeaders
    },
    saveToSentItems: true
  }

  return {
    email,
    attachments,
    bigAttachments
  }
}


/**
 * @param {UUID[]} ids
 */
MicrosoftMessage.getAll = async (ids) => {
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

          Slack.send({ channel: 'integration_logs', text: `remote-outlook-message-not-found id: ${message.id}`, emoji: ':skull:' })

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
MicrosoftMessage.get = async (id) => {
  const messages = await MicrosoftMessage.getAll([id])

  if (messages.length < 1)
    throw Error.ResourceNotFound(`MicrosoftMessage ${id} not found.`)

  return messages[0]
}

/**
 * @param {string} message_id Message remote-id
 * @param {UUID} microsoft_credential
 */
MicrosoftMessage.getByMessageId = async (message_id, microsoft_credential) => {
  const ids = await db.selectIds('microsoft/message/find_by_message_id', [message_id, microsoft_credential])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`MicrosoftMessage ${message_id} in credential ${microsoft_credential} not found.`)

  return MicrosoftMessage.get(ids[0])
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 */
MicrosoftMessage.getMCredentialMessagesNum = async (microsoft_credential) => {
  return await db.select('microsoft/message/count', [microsoft_credential])
}

MicrosoftMessage.create = async (records, microsoft_credential) => {
  if (records.length === 0)
    return []

  const res = await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_messages')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'internet_message_id'], {
        message_id: squel.rstr('EXCLUDED.message_id'),
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        thread_key: squel.rstr('EXCLUDED.thread_key'),
        in_reply_to: squel.rstr('EXCLUDED.in_reply_to'),
        in_bound: squel.rstr('EXCLUDED.in_bound'),
        is_read: squel.rstr('EXCLUDED.is_read'),
        recipients: squel.rstr('EXCLUDED.recipients'),

        subject: squel.rstr('EXCLUDED.subject'),
        has_attachments: squel.rstr('EXCLUDED.has_attachments'),
        attachments: squel.rstr('EXCLUDED.attachments'),

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

        deleted_at: null,
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, internet_message_id, message_id, thread_id, thread_key')

    q.name = `microsoft/message/bulk_upsert#${i}`

    return db.select(q)
  })

  await EmailThread.updateMicrosoft(_.uniq(res.map(r => r.thread_key)), microsoft_credential)

  return res
}

/**
 * @param {UUID[]} ids
 * @param {boolean} status
 * @param {UUID} microsoft_credential
 */
MicrosoftMessage.updateIsRead = async (ids, status, microsoft_credential) => {
  const threads = await db.map('microsoft/message/update_is_read', [
    ids,
    status
  ], 'thread_key')

  await EmailThread.updateMicrosoft(threads, microsoft_credential)
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {UUID[]} ids
 */
MicrosoftMessage.deleteMany = async (microsoft_credential, ids) => {
  const threads = await db.map('microsoft/message/delete_many', [ids], 'thread_key')

  await EmailThread.updateMicrosoft(threads, microsoft_credential)
  await EmailThread.prune(threads, { microsoft_credential })
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 */
MicrosoftMessage.deleteByCredential = async (microsoft_credential) => {
  const ids = await db.selectIds('microsoft/message/get_by_credential', [microsoft_credential])
  
  if (ids.length > 0) {
    await MicrosoftMessage.deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
MicrosoftMessage.deleteByInternetMessageIds = async (microsoft_credential, internet_message_ids) => {
  const ids = await db.selectIds('microsoft/message/get_by_internet_message_id', [microsoft_credential, internet_message_ids])
  
  if (ids.length > 0) {
    await MicrosoftMessage.deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} remote_message_ids
 */
MicrosoftMessage.deleteByRemoteMessageIds = async (microsoft_credential, remote_message_ids) => {
  const ids = await db.selectIds('microsoft/message/get_by_remote_message_id', [microsoft_credential, remote_message_ids])
  
  if (ids.length > 0) {
    await MicrosoftMessage.deleteMany(microsoft_credential, ids)
  }
}

/**
 * @param {UUID} mcid Microsoft credential id
 * @param {string} mid Message remote-id
 * @param {string} aid Attachment remote-id
 */
MicrosoftMessage.downloadAttachment = async (mcid, mid, aid) => {
  const microsoft = await getClient(mcid, 'outlook')
  const message   = await MicrosoftMessage.getByMessageId(mid, mcid)

  if (!message)
    throw Error.ResourceNotFound('Related Outlook-Message Not Found!')

  return await microsoft.getAttachmentNative(mid, aid)  
}

MicrosoftMessage.createAndSendMessage = async (params) => {
  const microsoft = await getClient(params.credential.id, 'outlook')
  const { email, attachments, bigAttachments } = await createEmailObject(params)
  const createMessageResult = await microsoft.createMessage(email)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createMessageResult.id, attachment)
    }

    await handleBigAttachments(microsoft, createMessageResult.id, bigAttachments)

    const updateMessageResult = await microsoft.updateMessage(createMessageResult.id, email.message)

    await microsoft.sendMessage(updateMessageResult.id)

    return {
      internetMessageId: updateMessageResult.internetMessageId,
      conversationId: updateMessageResult.conversationId
    }

  } catch (ex) {

    Context.log('outlook-createAndSendMessage-failed', params.credential.id, ex.message)

    await microsoft.deleteDraft(createMessageResult.id)
    throw ex
  }
}

MicrosoftMessage.sendReply = async (params) => {
  const microsoft = await getClient(params.credential.id, 'outlook')
  const { email, attachments, bigAttachments } = await createEmailObject(params)
  email.message.attachments = attachments
  const createReplyResult   = await microsoft.createReply(params.messageId)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createReplyResult.id, attachment)
    }

    await handleBigAttachments(microsoft, createReplyResult.id, bigAttachments)

    const updateMessageResult = await microsoft.updateMessage(createReplyResult.id, email.message)
    
    await microsoft.updateMessageExtensionsNative(updateMessageResult.id, email.message.extensions[0])
    await microsoft.sendMessage(updateMessageResult.id)

    return
  
  } catch (ex) {

    Context.log('outlook-sendReply-failed', params.credential.id, ex.message)

    await microsoft.deleteDraft(createReplyResult.id)
    throw ex
  }
}

/**
 * @param {IMicrosoftCredential} credential
 * @param {Array} ids
 * @param {boolean} status
 */
MicrosoftMessage.updateReadStatus = async (credential, ids, status) => {
  const microsoft = await getClient(credential.id, 'outlook')
  const messages  = await MicrosoftMessage.getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await microsoft.updateIsRead(remote_message_ids, status)

  return await MicrosoftMessage.updateIsRead(ids, status, credential.id)
}

/**
 * @param {IMicrosoftCredential} credential
 * @param {Array} ids
 */
MicrosoftMessage.batchTrash = async (credential, ids) => {
  const microsoft = await getClient(credential.id, 'outlook')
  const messages  = await MicrosoftMessage.getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await microsoft.batchDelete(remote_message_ids)

  return await MicrosoftMessage.deleteMany(credential.id, ids)
}


Orm.register('microsoft_message', 'MicrosoftMessage', MicrosoftMessage)

module.exports = MicrosoftMessage
