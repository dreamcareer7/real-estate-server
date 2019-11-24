const _ = require('lodash')
const config  = require('../../config')
const request = require('request-promise-native')
const { EventEmitter } = require('events')

const db      = require('../../utils/db.js')
const Context = require('../Context')
const Orm     = require('../Orm')
const squel   = require('../../utils/squel_extensions')
const promisify = require('../../utils/promisify')

const AttachedFile = require('../AttachedFile')

const GoogleCredential    = require('./credential')
const EmailThread         = require('../Email/thread')
const { getGoogleClient } = require('./plugin/client.js')
const { fetchGmailBody, generateGMesssageRecord } = require('./workers/gmail/common')


const GoogleMessage = {}
const emitter = new EventEmitter()

GoogleMessage.on = emitter.on.bind(emitter)
GoogleMessage.once = emitter.once.bind(emitter)

const SCOPE_GMAIL_READONLY = config.google_scopes.gmail.readonly // 'https://www.googleapis.com/auth/gmail.readonly'

const createEmailObject = async function (params) {
  const attachments = []

  for (const att of params.attachments) {
    const imageData = await request.get({
      url: att.url,
      encoding: 'binary'
    })

    const base64 = Buffer.from(imageData, 'binary').toString('base64')
    const size   = base64.length // in bytes

    if ( size > 5242880)
      throw Error.BadRequest('File size could not be greater than 4MB!')

    attachments.push({
      'filename': att.file_name,
      'contentId': att.content_id || null, // <img src="cid:some-image-cid" alt="img" />
      'content': base64,
      'encoding': 'base64',
      'type': att.type
    })
  }

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

const updateIsRead = async (id, status) => {
  return db.update('google/message/update_is_read', [id, status])
}

/**
 * @param {UUID} credential_id 
 */
async function getClient(credential_id) {
  const credential = await GoogleCredential.get(credential_id)

  if (credential.revoked)
    throw Error.BadRequest('Google-Credential Is Revoked!')

  if (credential.deleted_at)
    throw Error.BadRequest('Google-Credential Is Deleted!')

  if ( !credential.scope.includes(SCOPE_GMAIL_READONLY) )
    throw Error.BadRequest('Access is denied! Insufficient Permission.')

  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  return google
}

const gmailBatchGetMessages = async function (googleMessageIds, googleCredentialId) {
  const google = await getClient(googleCredentialId)

  try {
    return await fetchGmailBody(google, googleMessageIds)
  } catch (ex) {
    Context.log('Google-BatchGetMessages Failed!', ex)
    throw Error.BadRequest('Google-BatchGetMessages Failed!')
  }
}

/**
 * @param {UUID[]} ids
 */
GoogleMessage.getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  const { body: shouldFetchBody } = Orm.getAssociationConditions('email_thread.messages')

  if (shouldFetchBody) {
    const by_credential = _.groupBy(messages, 'google_credential')

    for (const google_credential in by_credential) {
      const bodies = await gmailBatchGetMessages(
        messages.map(m => m.message_id),
        google_credential
      )

      for (const message of messages) {
        const root = bodies[message.message_id]

        message.is_read = (root.labelIds) ? ((root.labelIds.includes('UNREAD')) ? false : true) : false
        message.snippet = root['snippet'] || ''
        message.unique_body = root['uniqueBody'] || ''
        message.html_body = root['htmlBody'] || ''
        message.text_body = root['textBody'] || ''  
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

  if (messages.length < 1) {
    throw Error.ResourceNotFound(`GoogleMessage ${id} was not found`)
  }

  return messages[0]
}

/**
 * @param {string[]} message_ids
 * @param {UUID} google_credential
 */
GoogleMessage.getByMessageIds = async (message_ids, google_credential) => {
  const ids = await db.selectIds('google/message/find_by_message_id', [message_ids, google_credential])

  if (!ids || ids.length < 1) {
    throw Error.ResourceNotFound(`GoogleMessages ${message_ids} of credential ${google_credential} was not found.`)
  }

  return GoogleMessage.getAll(ids)
}

GoogleMessage.getAsThreadMember = async (google_credential, message_id) => {
  const messages = await db.select('google/message/get_as_thread_member', [google_credential, message_id])

  if (messages.length < 1)
    return null

  return messages[0]
}

GoogleMessage.deleteByMessageIds = async (google_credential, message_ids) => {
  return await db.select('google/message/delete_by_message_id', [
    google_credential,
    message_ids
  ])
}

GoogleMessage.getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

GoogleMessage.publicize = async (message) => {
  if (message.has_attachments) {
    for (const attach of message.attachments) {
      attach.url = `emails/google/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
      attach.fullAddress = `${process.env.API_HOSTNAME}/emails/google/${message.owner}/messages/${message.message_id}/attachments/${attach.id}`
    }
  }

  return message
}

GoogleMessage.create = async (records) => {
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
      .returning('id, google_credential, message_id, thread_key')

    q.name = `google/message/bulk_upsert#${i}`

    return db.select(q)
  })

  EmailThread.emit('update', {
    threads: _.uniq(res.map(r => r.thread_key))
  })

  return res
}

/**
 * @param {UUID} gcid Google credential id
 * @param {string} mid Message-Id
 * @param {string} aid Attachment id
 */
GoogleMessage.downloadAttachment = async (gcid, mid, aid) => {
  const [googleMessage] = await GoogleMessage.getByMessageIds([mid], gcid)
  const google          = await getClient(gcid)

  if (!googleMessage)
    throw Error.ResourceNotFound('Related Google-Message Not Found!')

  let attachmentObj = null

  for (const att of googleMessage.attachments) {
    if ( att.id === aid )
      attachmentObj = att
  }

  if (!attachmentObj)
    throw Error.ResourceNotFound('Google-Message-Attachment Not Found!')

  const attachment = await google.getAttachment(mid, aid)

  return {
    attachmentObj,
    attachment
  }
}

GoogleMessage.sendEmail = async (params) => {
  const google = await getClient(params.credential)

  const body = await createEmailObject(params)

  
  return await google.sendMultipartMessage(body)
}

GoogleMessage.deleteAttachments = async (attachments) => {
  for (const att of attachments) {
    if (att.att_id)
      await promisify(AttachedFile.delete)(att.att_id)
  }
}

GoogleMessage.getRemoteMessage = async (credential, messageId) => {
  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  const message = await google.getMessage(messageId)

  const toCreateMeesagesArr = []

  toCreateMeesagesArr.push(generateGMesssageRecord(credential.id, message))

  await GoogleMessage.create(toCreateMeesagesArr)

  const gmailMessageBody = await fetchGmailBody(google, [message.id])
  const gmailMessage     = await GoogleMessage.getAsThreadMember(credential.id, message.id)

  const root = gmailMessageBody[gmailMessage.message_id]

  for (const attach of gmailMessage.attachments) {
    attach.url = `users/self/google/${gmailMessage.owner}/messages/${gmailMessage.message_id}/attachments/${attach.id}`
  }

  if (root) {
    gmailMessage.snippet     = root['snippet'] || null
    gmailMessage.unique_body = root['uniqueBody'] || null
    gmailMessage.html_body   = root['htmlBody'] || null
    gmailMessage.text_body   = root['textBody'] || null
  }

  return gmailMessage
}

GoogleMessage.updateReadStatus = async (credential, id, status) => {
  const google = await getGoogleClient(credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  const googleMessage = await GoogleMessage.get(id)

  if (status) {
    await google.markAsRead(googleMessage.message_id)
  } else {
    await google.markAsUnRead(googleMessage.message_id)
  }

  return await updateIsRead(googleMessage.id, status)
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage
