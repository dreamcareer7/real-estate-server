const config    = require('../../config')
const db        = require('../../utils/db.js')
const squel     = require('../../utils/squel_extensions')
const promisify = require('../../utils/promisify')

const _       = require('lodash')
const request = require('request-promise-native')
const { EventEmitter } = require('events')

const Context      = require('../Context')
const Orm          = require('../Orm')
const AttachedFile = require('../AttachedFile')
const EmailThread  = require('../Email/thread')

const MicrosoftCredential  = require('./credential')
const { getMGraphClient }  = require('./plugin/client.js')
const { fetchOutlookBody } = require('./workers/messages/common')


const MicrosoftMessage = {}
const emitter = new EventEmitter()

MicrosoftMessage.on   = emitter.on.bind(emitter)
MicrosoftMessage.once = emitter.once.bind(emitter)

const SCOPE_OUTLOOK_READ = config.microsoft_scopes.mail.read[0]



const getMicrosoftClient = async (credential) => {
  if (credential.revoked)
    throw Error.BadRequest('Microsoft-Credential is revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Microsoft-Credential is deleted!')

  if (!credential.scope.includes(SCOPE_OUTLOOK_READ))
    throw Error.BadRequest('Access is denied! Insufficient permission.')

  const microsoft  = await getMGraphClient(credential)

  if (!microsoft)
    throw Error.BadRequest('Microsoft-Client failed!')

  return microsoft
}

const createEmailObject = async function (params) {
  const attachments = []
  const limit    = config.microsoft_integration.attachment_size_limit
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
      '@odata.type': '#microsoft.graph.fileAttachment',
      'name': att.name || att.file_name,
      'ContentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
      'contentType': att.type,
      'size': size,
      'isInline': att.is_inline,
      'contentBytes': base64
    })

    // attachments.push({
    //   '@odata.type': '#microsoft.graph.fileAttachment',
    //   'name': 'smile.png',
    //   'contentType': 'image/png',
    //   'contentBytes': 'iVBORw0KGgoAAAANSUhEUgAAAA0AAAAJCAIAAABmGDE9AAAAA3NCSVQICAjb4U/gAAAAGHRFWHRTb2Z0d2FyZQBtYXRlLXNjcmVlbnNob3TIlvBKAAAAm0lEQVQYlSXNQYEYMRDAMHsSdKVRPkf4NuM+KgLy58/fX+f7/Ygz+h6V8+aA9ciF645EUe4I6RKYl5n37fZu7GxTtVC12ZltMRULbm0xBFC93ZkErHxVKwNixxmo9shMSyHQKuO9xgH1/T/GsBAVWsm8tihzwIGDXymMjuJbZK8QoOmG43EW1yHeHLTtBiE1esZPFp9Ttt/KlvAP2bGGQK9w/7UAAAAASUVORK5CYII='
    // })
  }

  if ( sizeSum > limit )
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)

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

      internetMessageHeaders: params.internetMessageHeaders
    },
    saveToSentItems: true
  }

  return {
    email,
    attachments
  }
}

/**
 * @param {string[]} message_ids 
 * @param {UUID} microsoft_credential 
 */
const outlookBatchGetMessages = async function (message_ids, microsoft_credential) {
  const credential = await MicrosoftCredential.get(microsoft_credential)
  const microsoft  = await getMicrosoftClient(credential)

  try {
    return await fetchOutlookBody(microsoft, message_ids)
  } catch (ex) {
    Context.log('Microsoft-BatchGetMessages Failed!', ex)
    throw Error.BadRequest('Microsoft list messages failed!')
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
      const bodies = await outlookBatchGetMessages(
        messages.map(m => m.message_id),
        microsoft_credential
      )

      for (const message of messages) {
        const root = bodies[message.message_id]

        message.is_read = root.isRead || false
        message.snippet = root['snippet'] || 'Email is moved or deleted in the remote server'
        message.unique_body = root['uniqueBody'] || 'Email is moved or deleted in the remote server'
        message.html_body = root['htmlBody'] || 'Email is moved or deleted in the remote server'
        message.text_body = root['textBody'] || 'Email is moved or deleted in the remote server'
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
 * @param {string} message_id Message remote-id
 */
MicrosoftMessage.getAsThreadMember = async (microsoft_credential, message_id) => {
  const messages = await db.select('microsoft/message/get_as_thread_member', [microsoft_credential, message_id])

  if (messages.length < 1)
    return null

  return messages[0]
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 * @param {string[]} internet_message_ids
 */
MicrosoftMessage.deleteByInternetMessageIds = async (microsoft_credential, internet_message_ids) => {
  const threads = await db.map('microsoft/message/delete_by_internet_message_id', [
    microsoft_credential,
    internet_message_ids
  ], 'thread_key')

  await EmailThread.update(threads, 'microsoft')
  await EmailThread.prune(threads)
}

/**
 * @param {UUID} microsoft_credential Microsoft credential id
 */
MicrosoftMessage.getMCredentialMessagesNum = async (microsoft_credential) => {
  return await db.select('microsoft/message/count', [microsoft_credential])
}

MicrosoftMessage.publicize = async message => {
  const uts = new Date().getTime()
  const expires_at = uts + (15 * 60 * 1000)

  if (message.has_attachments) {
    for (const attach of message.attachments) {

      const hash = encodeURIComponent(Crypto.encrypt(JSON.stringify({
        microsoft_credential: message.microsoft_credential,
        message_id: message.id,
        message_remote_id: message.message_id,
        attachment_id: attach.id,
        expires_at
      })))

      attach.url = `https://${process.env.API_HOSTNAME}/emails/attachments/${hash}` 
    }
  }

  return message
}

MicrosoftMessage.create = async (records) => {
  if (records.length === 0)
    return []

  const res = await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_messages')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'internet_message_id'], {
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

        // data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, internet_message_id, message_id, thread_key')

    q.name = `microsoft/message/bulk_upsert#${i}`

    return db.select(q)
  })

  await EmailThread.update(_.uniq(res.map(r => r.thread_key)), 'microsoft')

  return res
}

/**
 * @param {UUID} mcid Microsoft credential id
 * @param {string} mid Message remote-id
 * @param {string} aid Attachment remote-id
 */
MicrosoftMessage.downloadAttachment = async (mcid, mid, aid) => {
  const credential = await MicrosoftCredential.get(mcid)
  const microsoft  = await getMicrosoftClient(credential)
  
  const message = await MicrosoftMessage.getByMessageId(mid, credential.id)

  if (!message)
    throw Error.ResourceNotFound('Related Outlook-Message Not Found!')

  let attachmentObj = null

  for (const att of message.attachments) {
    if ( att.id === aid )
      attachmentObj = att
  }

  if (!attachmentObj)
    throw Error.ResourceNotFound('Outlook message\'s attachment not found!')

  return await microsoft.getAttachment(mid, aid)  
}

MicrosoftMessage.sendEmail = async (params) => {
  const microsoft              = await getMicrosoftClient(params.credential)
  const { email, attachments } = await createEmailObject(params)
  email.message.attachments    = attachments

  return await microsoft.sendMultipartMessage(email)
}

MicrosoftMessage.createAndSendMessage = async (params) => {
  const microsoft              = await getMicrosoftClient(params.credential)
  const { email, attachments } = await createEmailObject(params)
  const createMessageResult    = await microsoft.createMessage(email)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createMessageResult.id, attachment)
    }

    const updateMessageResult = await microsoft.updateMessage(createMessageResult.id, email.message)
    await microsoft.sendMessage(updateMessageResult.id)

    return {
      internetMessageId: updateMessageResult.internetMessageId,
      conversationId: updateMessageResult.conversationId
    }

  } catch (ex) {

    await microsoft.deleteDraft(createMessageResult.id)

    throw ex
  }
}

MicrosoftMessage.sendReply = async (params) => {
  // MGraph.createReply(messageId)
  // MGraph.updateMessage(messageId, message)
  // MGraph.addAttachment(messageId, attachment)
  // MGraph.sendMessage(messageId)

  const microsoft              = await getMicrosoftClient(params.credential)
  const { email, attachments } = await createEmailObject(params)
  email.message.attachments    = attachments
  const createReplyResult      = await microsoft.createReply(params.messageId)

  try {
    for (const attachment of attachments) {
      await microsoft.addAttachmentNative(createReplyResult.id, attachment)
    }

    const updateMessageResult = await microsoft.updateMessage(createReplyResult.id, email.message)

    await microsoft.sendMessage(updateMessageResult.id)

    return {
      internetMessageId: updateMessageResult.internetMessageId,
      conversationId: updateMessageResult.conversationId
    }
  
  } catch (ex) {

    await microsoft.deleteDraft(createReplyResult.id)

    throw ex
  }
}

MicrosoftMessage.deleteAttachments = async (attachments) => {
  for (const att of attachments) {
    if (att.att_id)
      await promisify(AttachedFile.delete)(att.att_id)
  }
}

/**
 * @param {UUID} id 
 * @param {boolean} status 
 */
MicrosoftMessage.updateIsRead = async (id, status) => {
  return db.update('microsoft/message/update_is_read', [id, status])
}

/**
 * @param {IMicrosoftCredential} credential
 * @param {string} messageId
 * @param {boolean} status
 */
MicrosoftMessage.updateReadStatus = async (credential, messageId, status) => {
  const microsoft        = await getMicrosoftClient(credential)
  const microsoftMessage = await MicrosoftMessage.getByMessageId(messageId, credential.id)

  if (status) {
    await microsoft.markAsRead(microsoftMessage.message_id)
  } else {
    await microsoft.markAsUnRead(microsoftMessage.message_id)
  }

  return await MicrosoftMessage.updateIsRead(microsoftMessage.id, status)
}

MicrosoftMessage.searchInThreads = async (mcid, query, page) => {
  const credential = await MicrosoftCredential.get(mcid)
  const microsoft  = await getMicrosoftClient(credential)
  const messages   = await microsoft.searchThreads(25, query, page)

  const threadKeys = [...new Set(messages.map(msg => `${mcid}${msg.conversationId}`))]

  return threadKeys
}



Orm.register('microsoft_message', 'MicrosoftMessage', MicrosoftMessage)

module.exports = MicrosoftMessage
