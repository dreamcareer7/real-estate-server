const db      = require('../../utils/db.js')
const Orm     = require('../Orm')
const squel   = require('../../utils/squel_extensions')
const request = require('request-promise-native')

const GoogleCredential    = require('./credential')
const { getGoogleClient } = require('./plugin/client.js')
const { fetchGmailBody, generateGMesssageRecord } = require('./workers/gmail/common')


const GoogleMessage = {}


const createEmailObject = async function (params) {
  const attachments = []

  for (const att of params.attachments) {
    const imageData = await request.get({
      url: att.link,
      encoding: 'binary'
    })

    const base64 = Buffer.from(imageData, 'binary').toString('base64')
    const size   = base64.length // in bytes

    if ( size > 5242880)
      throw Error.BadRequest('File-size could not be greater than 4-MB!')

    attachments.push({
      filename: att.filename,
      content: base64,
      encoding: 'base64',
      type: att.type
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


GoogleMessage.getAll = async (message_ids, google_credential) => {
  const messages = await db.select('google/message/get', [message_ids, google_credential])

  return messages
}

GoogleMessage.get = async (message_id, google_credential) => {
  const messages = await GoogleMessage.getAll([message_id], google_credential)

  if (messages.length < 1)
    return null

  return messages[0]
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

GoogleMessage.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at
  delete model.data

  return model
}

GoogleMessage.create = async (records) => {
  return await db.chunked(records, 22, (chunk, i) => {
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
      .returning('id, google_credential, message_id')
      // .returning('id, google_credential, message_id, thread_id, history_id, recipients, in_bound, message_date, message_created_at, data')

    q.name = 'google/message/bulk_upsert'

    return db.select(q)
  })  
}

GoogleMessage.downloadAttachment = async (gcid, mid, aid) => {
  const credential    = await GoogleCredential.get(gcid)
  const googleMessage = await GoogleMessage.get(mid, credential.id)
  const google        = await getGoogleClient(credential)

  if (!credential)
    throw Error.ResourceNotFound('Google-Credential Not Found!')

  if (!googleMessage)
    throw Error.ResourceNotFound('Related Google-Message Not Found!')

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

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
  const google = await getGoogleClient(params.credential)

  if (!google)
    throw Error.BadRequest('Google-Client Failed!')

  const body = await createEmailObject(params)

  return await google.sendMultipartMessage(body)
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




Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage