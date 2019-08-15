const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleMessage = {}



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

GoogleMessage.getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

GoogleMessage.getThread = async (google_credential, thread_id) => {
  const message = await db.select('google/message/get_by_thread', [google_credential, thread_id])

  if (message.length < 1)
    throw Error.ResourceNotFound('No Any Message!')

  const messageIds = message.map( message => message.message_id )

  return await GoogleMessage.getAll(messageIds, google_credential)
}

GoogleMessage.publicize = async (model) => {
  delete model.created_at
  delete model.updated_at
  delete model.deleted_at
  delete model.data

  return model
}

GoogleMessage.create = async (records) => {
  return await db.chunked(records, 23, (chunk, i) => {
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

        data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, message_id')
      // .returning('id, google_credential, message_id, thread_id, history_id, recipients, in_bound, message_date, message_created_at, data')

    q.name = 'google/message/bulk_upsert'

    return db.select(q)
  })  
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage