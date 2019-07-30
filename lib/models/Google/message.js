const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleMessage = {}



GoogleMessage.getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  return messages
}

GoogleMessage.get = async (id) => {
  const messages = await GoogleMessage.getAll([id])

  if (messages.length < 1)
    return null

  return messages[0]
}

GoogleMessage.getGCredentialMessagesNum = async (google_credential) => {
  return await db.select('google/message/count', [google_credential])
}

GoogleMessage.create = async (records) => {
  return await db.chunked(records, 8, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'message_id'], {
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        history_id: squel.rstr('EXCLUDED.history_id'),
        recipients: squel.rstr('EXCLUDED.recipients'),
        in_bound: squel.rstr('EXCLUDED.in_bound'),
        message_created_at: squel.rstr('EXCLUDED.message_created_at'),
        data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential')
      // .returning('id, google_credential, message_id, thread_id, history_id, recipients, in_bound, message_created_at, data')

    q.name = 'google/message/bulk_upsert'

    return db.select(q)
  })  
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage